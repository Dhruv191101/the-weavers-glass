// background.js

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "captureElement") {
    // 1. Capture the visible tab
    chrome.tabs.captureVisibleTab(sender.tab.windowId, { format: "png" }, async (dataUrl) => {
      try {
        if (chrome.runtime.lastError) {
          throw new Error(chrome.runtime.lastError.message);
        }

        const rect = request.rect;
        
        // 2. Crop using OffscreenCanvas
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const bitmap = await createImageBitmap(blob);
        
        // Handle device pixel ratio scaling
        const scale = bitmap.width / request.viewportWidth;
        const cropX = rect.left * scale;
        const cropY = rect.top * scale;
        const cropW = rect.width * scale;
        const cropH = rect.height * scale;

        const offscreen = new OffscreenCanvas(cropW, cropH);
        const ctx = offscreen.getContext("2d");
        ctx.drawImage(bitmap, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
        
        const croppedBlob = await offscreen.convertToBlob({ type: "image/png" });
        
        // Convert Blob to Base64 in Service Worker (FileReader is not available)
        const buffer = await croppedBlob.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = '';
        const chunkSize = 8192;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
        }
        const croppedBase64 = 'data:image/png;base64,' + btoa(binary);

        // 3. Send to backend
        fetch("http://localhost:8000/api/capture", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            html_content: request.html,
            css_content: request.css,
            source_url: request.sourceUrl,
            screenshot_base64: croppedBase64
          })
        })
        .then(res => res.json())
        .then(data => {
          console.log("Successfully stored snippet with screenshot.");
          sendResponse({ success: true, data });
          
          chrome.action.setBadgeText({ text: '✓' });
          setTimeout(() => { chrome.action.setBadgeText({ text: '' }); }, 2000);
        })
        .catch(error => {
          console.error("Error storing snippet:", error);
          sendResponse({ success: false, error: error.message });
          chrome.action.setBadgeText({ text: '!' });
          setTimeout(() => { chrome.action.setBadgeText({ text: '' }); }, 2000);
        });

      } catch (err) {
        console.error("Capture failed:", err);
        sendResponse({ success: false, error: err.message });
        chrome.action.setBadgeText({ text: '!' });
        setTimeout(() => { chrome.action.setBadgeText({ text: '' }); }, 2000);
      }
    });
    
    // Return true to indicate asynchronous response
    return true; 
  }
});
