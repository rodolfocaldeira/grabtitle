// 1. Set up context menus
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "copy-raw-url",
    title: "Copy URL only",
    contexts: ["action"]
  });
  chrome.contextMenus.create({
    id: "copy-rich-text",
    title: "Copy as Rich Link",
    contexts: ["action"]
  });
});

/**
 * This function runs INSIDE the web page (not the background).
 * It has full access to the DOM and the window's Clipboard API.
 */
async function copyInsideTab(text, html = null) {
  try {
    // 1. Try Modern Async API
    if (typeof ClipboardItem !== "undefined") {
      const blobs = {
        "text/plain": new Blob([text], { type: "text/plain" })
      };
      
      if (html) {
        blobs["text/html"] = new Blob([html], { type: "text/html" });
      }

      await navigator.clipboard.write([new ClipboardItem(blobs)]);
      console.log("Copied via ClipboardItem API");
      return;
    } 
    
    // 2. Fallback for simple text (if ClipboardItem missing)
    if (!html) {
      await navigator.clipboard.writeText(text);
      console.log("Copied via writeText API");
      return;
    }

    throw new Error("Clipboard API unavailable");

  } catch (err) {
    // 3. Ultimate Fallback: document.execCommand (Legacy but robust)
    console.warn("Clipboard API failed, trying execCommand fallback", err);
    
    const div = document.createElement("div");
    // Prevent scrolling to bottom
    div.style.position = "fixed";
    div.style.left = "-9999px";
    div.style.top = "0";
    
    if (html) {
      div.innerHTML = html;
    } else {
      div.textContent = text;
    }
    
    document.body.appendChild(div);
    
    const selection = window.getSelection();
    const range = document.createRange();
    
    try {
      range.selectNodeContents(div);
      selection.removeAllRanges();
      selection.addRange(range);
      document.execCommand("copy");
      console.log("Copied via execCommand");
    } catch (e) {
      console.error("All copy methods failed", e);
    } finally {
      document.body.removeChild(div);
      selection.removeAllRanges();
    }
  }
}

// 2. Helper to inject the script
function injectCopyScript(tab, text, html = null) {
  if (!tab.id || !tab.url.startsWith("http")) return; // Skip restricted pages (chrome://)

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: copyInsideTab,
    args: [text, html]
  }).catch((err) => {
    console.error("Failed to inject script:", err);
  });
}

// 3. Handle Left-Click (Icon) -> Markdown
chrome.action.onClicked.addListener((tab) => {
  if (!tab.url) return;
  const text = `[${tab.title}](${tab.url})`;
  injectCopyScript(tab, text, null);
});

// 4. Handle Right-Click (Context Menu)
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab.url) return;

  if (info.menuItemId === "copy-raw-url") {
    injectCopyScript(tab, tab.url, null);
  } else if (info.menuItemId === "copy-rich-text") {
    const html = `<a href="${tab.url}">${tab.title}</a>`;
    const text = `[${tab.title}](${tab.url})`;
    injectCopyScript(tab, text, html);
  }
});