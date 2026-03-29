const convertToReact = (html, css) => {
    let jsx = html.replace(/class=/g, 'className=').replace(/for=/g, 'htmlFor=');
    jsx = jsx.replace(/<(img|input|br|hr|meta|link)([^>]*[^\/])>/g, '<$1$2 />');
    return `// Extracted CSS:\n/*\n${css}\n*/\n\nconst WeaverComponent = () => {\n  return (\n    <>\n      ${jsx}\n    </>\n  );\n};\n\nexport default WeaverComponent;`;
};

const convertToTailwind = (html, css) => {
    const tailwindMap = {
        'display: flex': 'flex', 'display: grid': 'grid', 'display: none': 'hidden', 'display: block': 'block', 'display: inline-block': 'inline-block',
        'align-items: center': 'items-center', 'align-items: flex-start': 'items-start', 'align-items: flex-end': 'items-end',
        'justify-content: center': 'justify-center', 'justify-content: space-between': 'justify-between', 'justify-content: flex-start': 'justify-start', 'justify-content: flex-end': 'justify-end',
        'flex-direction: column': 'flex-col', 'flex-direction: row': 'flex-row', 'flex-wrap: wrap': 'flex-wrap',
        'position: absolute': 'absolute', 'position: relative': 'relative', 'position: fixed': 'fixed',
        'text-align: center': 'text-center', 'text-align: right': 'text-right', 'text-align: left': 'text-left',
        'font-weight: bold': 'font-bold', 'font-weight: 700': 'font-bold', 'font-weight: 600': 'font-semibold', 'font-weight: 500': 'font-medium',
        'font-style: italic': 'italic', 'cursor: pointer': 'cursor-pointer', 'overflow: hidden': 'overflow-hidden'
    };

    const classBlocks = css.match(/\.wg-el-\d+\s*{[^}]+}/g) || [];
    let twHtml = html;

    classBlocks.forEach(block => {
        const classNameMatch = block.match(/\.(wg-el-\d+)/);
        if (!classNameMatch) return;
        const className = classNameMatch[1];
        
        let twClasses = [];
        const lines = block.split('\n');
        
        lines.forEach(line => {
            const ruleObj = line.trim().replace(';', '');
            if (!ruleObj || ruleObj.endsWith('{') || ruleObj === '}') return;
            
            if (tailwindMap[ruleObj]) {
                twClasses.push(tailwindMap[ruleObj]);
                return;
            }
            
            const parts = ruleObj.split(': ');
            if (parts.length === 2) {
                const prop = parts[0], val = parts[1];
                if (prop === 'background-color') twClasses.push(`bg-[${val.replace(/ /g,'')}]`);
                else if (prop === 'color') twClasses.push(`text-[${val.replace(/ /g,'')}]`);
                else if (prop === 'width') twClasses.push(`w-[${val}]`);
                else if (prop === 'height') twClasses.push(`h-[${val}]`);
                else if (prop.startsWith('padding')) twClasses.push(`${prop.replace('padding','p').replace('-top','t').replace('-bottom','b').replace('-left','l').replace('-right','r')}-[${val}]`);
                else if (prop.startsWith('margin')) twClasses.push(`${prop.replace('margin','m').replace('-top','t').replace('-bottom','b').replace('-left','l').replace('-right','r')}-[${val}]`);
                else if (prop === 'font-size') twClasses.push(`text-[${val}]`);
                else if (prop === 'border-radius') twClasses.push(`rounded-[${val}]`);
                else if (prop === 'box-shadow') twClasses.push(`shadow-[${val.replace(/ /g,'_')}]`);
                else if (prop === 'gap') twClasses.push(`gap-[${val}]`);
                else if (['top','left','right','bottom', 'z-index'].includes(prop)) twClasses.push(`${prop === 'z-index' ? 'z' : prop}-[${val}]`);
            }
        });

        if (twClasses.length > 0) {
            const regex = new RegExp(`class="([^"]*?\\b${className}\\b[^"]*?)"`);
            twHtml = twHtml.replace(regex, `class="$1 ${twClasses.join(' ')}"`);
            const removeRegex = new RegExp(`\\b${className}\\b`, 'g');
            twHtml = twHtml.replace(removeRegex, '').replace(/class="\s+/g, 'class="').replace(/\s+"/g, '"');
        }
    });
    return twHtml;
};

document.addEventListener("DOMContentLoaded", () => {
  const captureToggle = document.getElementById("captureToggle");
  const galleryContainer = document.getElementById("galleryContainer");
  const introModal = document.getElementById("introModal");
  const startWeavingBtn = document.getElementById("startWeavingBtn");

  // Check if user has seen onboarding
  chrome.storage.local.get(["hasSeenIntro"], (result) => {
    if (!result.hasSeenIntro) {
      introModal.classList.remove("hidden");
    }
  });

  // Handle onboarding close
  startWeavingBtn.addEventListener("click", () => {
    chrome.storage.local.set({ hasSeenIntro: true }, () => {
      introModal.classList.add("hidden");
    });
  });

  // Fetch snippets from backend
  const fetchSnippets = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/snippets");
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      renderGallery(data);
    } catch (error) {
      console.error(error);
      galleryContainer.innerHTML = `
        <div style="text-align:center; padding: 20px; color: #ff6b6b;">
          Could not connect to the Sanctuary backend.<br>
          <span style="font-size: 0.8em; color: var(--text-secondary);">Ensure localhost:8000 is running.</span>
        </div>
      `;
    }
  };

  const renderGallery = (snippets) => {
    galleryContainer.innerHTML = "";
    if (snippets.length === 0) {
      galleryContainer.innerHTML = `
        <div style="text-align:center; padding: 40px 20px; color: var(--text-secondary);">
          Your gallery is empty.<br>
          Start capturing UI elements!
        </div>
      `;
      return;
    }

    const domainCounts = {};
    const processedSnippets = snippets.reverse().map(snippet => {
      const hostname = new URL(snippet.source_url).hostname.replace('www.', '');
      const domainName = hostname.split('.')[0];
      
      domainCounts[domainName] = (domainCounts[domainName] || 0) + 1;
      snippet.displayName = `${domainName}${domainCounts[domainName]}`;
      return snippet;
    }).reverse();

    processedSnippets.forEach((snippet, index) => {
      const card = document.createElement("div");
      card.className = "snippet-card";
      card.style.animationDelay = `${index * 0.1}s`;

      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = now.toLocaleDateString();

      const imgSrc = snippet.screenshot_base64 ? snippet.screenshot_base64 : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="auto"><rect fill="%23222" width="100%" height="100%"/></svg>';

      card.innerHTML = `
        <div class="card-header">
          <span class="card-title">${snippet.displayName}</span>
          <span class="card-date" title="${snippet.source_url}">${dateStr} ${timeStr}</span>
        </div>
        <div class="snippet-content">
          <img src="${imgSrc}" class="snippet-thumbnail" alt="${snippet.displayName} UI" />
          <div class="snippet-details">
            <div class="card-actions">
              <button class="code-btn" data-type="html" data-id="${snippet.id}">HTML</button>
              <button class="code-btn" data-type="css" data-id="${snippet.id}">CSS</button>
              <button class="code-btn" data-type="react" data-id="${snippet.id}">React</button>
              <button class="code-btn" data-type="tailwind" data-id="${snippet.id}">Tailwind</button>
            </div>
            <button class="codepen-btn" data-id="${snippet.id}">🚀 Open in CodePen</button>
          </div>
        </div>
      `;

      // Copy logic router
      const buttons = card.querySelectorAll(".code-btn");
      buttons.forEach(btn => {
        btn.addEventListener("click", () => {
          const type = btn.getAttribute("data-type");
          let contentToCopy = "";

          if (type === "html") contentToCopy = snippet.html_content;
          else if (type === "css") contentToCopy = snippet.css_content;
          else if (type === "react") contentToCopy = convertToReact(snippet.html_content, snippet.css_content);
          else if (type === "tailwind") contentToCopy = convertToTailwind(snippet.html_content, snippet.css_content);

          navigator.clipboard.writeText(contentToCopy).then(() => {
            const originalText = btn.innerText;
            btn.innerText = "Copied!";
            btn.style.background = "rgba(0, 255, 170, 0.2)";
            btn.style.color = "var(--accent)";
            btn.style.borderColor = "var(--accent)";
            setTimeout(() => {
              btn.innerText = originalText;
              btn.style.background = "";
              btn.style.color = "";
              btn.style.borderColor = "";
            }, 2000);
          });
        });
      });

      // CodePen logic
      const cpBtn = card.querySelector(".codepen-btn");
      if (cpBtn) {
        cpBtn.addEventListener("click", () => {
          const cpData = {
            title: snippet.displayName + " (Weaver's Glass)",
            description: "Automatically mapped and extracted via Weaver's Glass",
            html: snippet.html_content,
            css: snippet.css_content,
            editors: "110" // 1 HTML, 1 CSS, 0 JS visible
          };
          
          const form = document.createElement("form");
          form.method = "POST";
          form.action = "https://codepen.io/pen/define";
          form.target = "_blank";
          form.style.display = "none";
          
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = "data";
          // Properly escape quotations for the value attribute
          input.value = JSON.stringify(cpData).replace(/"/g, "&quot;").replace(/'/g, "&apos;");
          
          form.appendChild(input);
          document.body.appendChild(form);
          form.submit();
          
          // Cleanup
          setTimeout(() => form.remove(), 100);
        });
      }

      galleryContainer.appendChild(card);
    });
  };

  captureToggle.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.url.startsWith("http")) {
        alert("Cannot extract from this page. Open a real website first!");
        return;
    }

    chrome.tabs.sendMessage(tab.id, { action: "toggleSelectionMode" }, (response) => {
      if (chrome.runtime.lastError) {
          chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ["content.js"]
          }, () => {
              chrome.tabs.sendMessage(tab.id, { action: "toggleSelectionMode" }, (res) => {
                  updateToggleUI(res && res.active);
              });
          });
      } else {
          updateToggleUI(response && response.active);
      }
    });
  });

  const updateToggleUI = (isActive) => {
    if (isActive) {
      captureToggle.classList.add("active");
      captureToggle.innerHTML = '<span class="icon">🛑</span> Cancel Selection';
    } else {
      captureToggle.classList.remove("active");
      captureToggle.innerHTML = '<span class="icon">🔍</span> Capture Mode';
    }
  };

  fetchSnippets();
});
