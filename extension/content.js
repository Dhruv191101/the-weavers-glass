const visualProperties = [
    'display', 'position', 'top', 'bottom', 'left', 'right', 'z-index',
    'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
    'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
    'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    'box-sizing', 'background-color', 'background-image', 'background-size', 
    'background-position', 'background-repeat', 'color', 'font-family', 
    'font-size', 'font-weight', 'line-height', 'letter-spacing', 'text-align', 
    'text-decoration', 'text-transform', 'border-top', 'border-right', 
    'border-bottom', 'border-left', 'border-radius', 'box-shadow', 'opacity',
    'flex-direction', 'justify-content', 'align-items', 'flex-wrap', 'gap',
    'grid-template-columns', 'grid-template-rows', 'justify-items', 'align-content',
    'overflow', 'overflow-x', 'overflow-y', 'cursor', 'transform', 'transition'
];

const extractDeepCSSAndHTML = (rootElement) => {
    let cssString = '';
    let counter = 0;
    
    // Create a deep clone to manipulate HTML without affecting the live page
    const clonedRoot = rootElement.cloneNode(true);
    
    // Traverse both original (for styles) and clone (to inject classes)
    const walk = (originalNode, cloneNode) => {
        if (originalNode.nodeType !== Node.ELEMENT_NODE) return;
        
        counter++;
        const uniqueClass = `wg-el-${counter}`;
        cloneNode.classList.add(uniqueClass);
        
        const computed = window.getComputedStyle(originalNode);
        let nodeCSS = `.${uniqueClass} {\n`;
        let hasStyles = false;
        
        visualProperties.forEach(prop => {
            const val = computed.getPropertyValue(prop);
            // Ignore default values
            if (val && val !== 'none' && val !== 'normal' && val !== '0px' && val !== 'auto' && val !== 'rgba(0, 0, 0, 0)' && val !== 'transparent' && val !== 'visible') {
                if (prop === 'background-color' && val === 'rgba(0, 0, 0, 0)') return;
                nodeCSS += `  ${prop}: ${val};\n`;
                hasStyles = true;
            }
        });
        nodeCSS += `}\n\n`;
        
        if (hasStyles) {
            cssString += nodeCSS;
        }
        
        const originalChildren = Array.from(originalNode.childNodes);
        const cloneChildren = Array.from(cloneNode.childNodes);
        
        for (let i = 0; i < originalChildren.length; i++) {
            walk(originalChildren[i], cloneChildren[i]);
        }
    };
    
    walk(rootElement, clonedRoot);
    
    return {
        html: clonedRoot.outerHTML,
        css: cssString.trim()
    };
};

let selectionModeActive = false;
let hoveredElement = null;
let breadcrumbEl = null;

const outlineStyle = "2px solid rgba(0, 255, 170, 0.8)";
const overlayBoxShadow = "inset 0 0 0 1000px rgba(0, 255, 170, 0.1)";

const generateBreadcrumbText = (el) => {
    if (!el) return "";
    let str = el.tagName.toLowerCase();
    if (el.id) str += `#${el.id}`;
    if (el.classList.length > 0) {
        str += `.${Array.from(el.classList).join('.')}`;
    }
    return str;
};

const createBreadcrumb = () => {
    if (breadcrumbEl) return;
    breadcrumbEl = document.createElement('div');
    breadcrumbEl.id = 'wg-breadcrumb';
    breadcrumbEl.style.cssText = `
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(13, 17, 23, 0.95);
        color: #e6edf3;
        padding: 8px 18px;
        border-radius: 20px;
        border: 1px solid rgba(0, 255, 170, 0.4);
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 13px;
        z-index: 2147483647;
        box-shadow: 0 4px 20px rgba(0, 255, 170, 0.15);
        backdrop-filter: blur(10px);
        pointer-events: none;
        transition: opacity 0.2s ease;
        opacity: 0;
    `;
    document.body.appendChild(breadcrumbEl);
};

const destroyBreadcrumb = () => {
    if (breadcrumbEl) {
        breadcrumbEl.remove();
        breadcrumbEl = null;
    }
};

const updateHoverState = (newEl) => {
    if (!newEl || newEl === document.body || newEl === document.documentElement) return;
    
    // Clear old styles
    if (hoveredElement && hoveredElement !== newEl) {
        hoveredElement.style.outline = hoveredElement.dataset.origOutline || '';
        hoveredElement.style.boxShadow = hoveredElement.dataset.origBoxShadow || '';
    }
    
    hoveredElement = newEl;
    
    // Store original before applying highlight (only if not already stored)
    if (hoveredElement.dataset.origOutline === undefined) {
        hoveredElement.dataset.origOutline = hoveredElement.style.outline;
        hoveredElement.dataset.origBoxShadow = hoveredElement.style.boxShadow;
    }
    
    // Apply highlight
    hoveredElement.style.outline = outlineStyle;
    hoveredElement.style.boxShadow = overlayBoxShadow;
    
    // Update breadcrumb
    if (breadcrumbEl) {
        breadcrumbEl.style.opacity = '1';
        const parent = newEl.parentElement ? generateBreadcrumbText(newEl.parentElement) + " > " : "";
        breadcrumbEl.innerHTML = `<span style="color: #8b949e;">${parent}</span><strong style="color: #00ffaa;">${generateBreadcrumbText(newEl)}</strong>`;
    }
};

function handleMouseOver(e) {
    if (!selectionModeActive) return;
    e.stopPropagation();
    updateHoverState(e.target);
}

function handleMouseOut(e) {
    if (!selectionModeActive) return;
    if (e.target.dataset.origOutline !== undefined && e.target !== hoveredElement) {
        e.target.style.outline = e.target.dataset.origOutline;
        e.target.style.boxShadow = e.target.dataset.origBoxShadow;
    }
}

function handleKeyDown(e) {
    if (!selectionModeActive) return;
    
    if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (hoveredElement && hoveredElement.parentElement) {
            updateHoverState(hoveredElement.parentElement);
        }
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (hoveredElement && hoveredElement.firstElementChild) {
            updateHoverState(hoveredElement.firstElementChild);
        }
    } else if (e.key === 'Escape') {
        e.preventDefault();
        toggleSelectionMode(false);
    }
}

function handleClick(e) {
    if (!selectionModeActive) return;
    e.preventDefault();
    e.stopPropagation();

    const element = hoveredElement || e.target;
    
    // Clean up highlight
    element.style.outline = element.dataset.origOutline || '';
    element.style.boxShadow = element.dataset.origBoxShadow || '';

    setTimeout(() => {
        const rect = element.getBoundingClientRect();
        const payload = extractDeepCSSAndHTML(element);
        
        chrome.runtime.sendMessage({
            action: "captureElement",
            html: payload.html,
            css: payload.css,
            sourceUrl: window.location.href,
            rect: {
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height
            },
            viewportWidth: window.innerWidth
        }, (response) => {
            if (response && response.success) {
                showToast("✨ Component Extracted Flawlessly!");
            } else {
                showToast("❌ Failed to capture snippet.");
            }
        });
    }, 50);

    toggleSelectionMode(false);
}

function showToast(message) {
    const toast = document.createElement("div");
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: rgba(15, 23, 42, 0.9);
        color: #fff;
        padding: 12px 24px;
        border-radius: 8px;
        border: 1px solid rgba(255,255,255,0.1);
        font-family: system-ui, sans-serif;
        font-weight: 500;
        z-index: 2147483647;
        box-shadow: 0 10px 25px rgba(0,0,0,0.5);
        backdrop-filter: blur(8px);
        transition: opacity 0.3s ease;
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function toggleSelectionMode(forceState = null) {
    selectionModeActive = forceState !== null ? forceState : !selectionModeActive;
    
    if (selectionModeActive) {
        createBreadcrumb();
        document.addEventListener("mouseover", handleMouseOver, { capture: true });
        document.addEventListener("mouseout", handleMouseOut, { capture: true });
        document.addEventListener("click", handleClick, { capture: true });
        document.addEventListener("keydown", handleKeyDown, { capture: true });
        document.body.style.cursor = "crosshair";
        showToast("🔍 The Weaver's Glass: Selection Mode Active");
    } else {
        destroyBreadcrumb();
        document.removeEventListener("mouseover", handleMouseOver, { capture: true });
        document.removeEventListener("mouseout", handleMouseOut, { capture: true });
        document.removeEventListener("click", handleClick, { capture: true });
        document.removeEventListener("keydown", handleKeyDown, { capture: true });
        document.body.style.cursor = "default";
        
        if (hoveredElement) {
            hoveredElement.style.outline = hoveredElement.dataset.origOutline || '';
            hoveredElement.style.boxShadow = hoveredElement.dataset.origBoxShadow || '';
            hoveredElement = null;
        }
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "toggleSelectionMode") {
        toggleSelectionMode();
        sendResponse({ active: selectionModeActive });
    }
});
