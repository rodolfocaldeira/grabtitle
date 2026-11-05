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
  chrome.contextMenus.create({
    id: "copy-image-markdown",
    title: "Copy Image as Markdown",
    contexts: ["image"]
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

// Markdown/HTML escaping helpers (background-side, run before text is sent to the tab)

// Link/alt text: keep on one line and stop "[" / "]" / "\" from breaking the syntax
function mdText(s) {
  return String(s).replace(/\s+/g, " ").trim().replace(/[\\\[\]]/g, "\\$&");
}

// Link destination: spaces and parentheses would end the URL early
function mdUrl(s) {
  return String(s).replace(/ /g, "%20").replace(/\(/g, "%28").replace(/\)/g, "%29");
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function markdownLink(tab) {
  return `[${mdText(tab.title || tab.url)}](${mdUrl(tab.url)})`;
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

/**
 * Runs INSIDE the web page: finds the right-clicked <img> by its src
 * and returns its alt text (or title) so it can be used as Markdown alt text.
 */
function findImageAlt(srcUrl) {
  const img = Array.from(document.images).find((i) => i.currentSrc === srcUrl || i.src === srcUrl);
  return (img && (img.alt || img.title)) || "";
}

async function copyImageMarkdown(info, tab) {
  let alt = "";
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id, frameIds: [info.frameId || 0] },
      func: findImageAlt,
      args: [info.srcUrl]
    });
    alt = result?.result || "";
  } catch (err) {
    console.error("Failed to read image alt text:", err);
  }

  injectCopyScript(tab, `![${mdText(alt) || "image"}](${mdUrl(info.srcUrl)})`, null);
}

// 3. Handle Left-Click (Icon) -> Markdown
chrome.action.onClicked.addListener((tab) => {
  if (!tab.url) return;
  injectCopyScript(tab, markdownLink(tab), null);
});

// 4. Handle Right-Click (Context Menu)
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab.url) return;

  if (info.menuItemId === "copy-image-markdown") {
    copyImageMarkdown(info, tab);
  } else if (info.menuItemId === "copy-raw-url") {
    injectCopyScript(tab, tab.url, null);
  } else if (info.menuItemId === "copy-rich-text") {
    const html = `<a href="${escapeHtml(tab.url)}">${escapeHtml(tab.title || tab.url)}</a>`;
    injectCopyScript(tab, markdownLink(tab), html);
  }
});