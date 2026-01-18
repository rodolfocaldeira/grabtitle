// 1. Set up the context menu when the extension is installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "copy-raw-url",
    title: "Copy URL only",
    contexts: ["action"] // 'action' makes it appear on the extension icon context menu
  });
});

/**
 * This function is injected into the webpage to perform the copy action.
 * It uses a fallback method (textarea) to ensure compatibility across different 
 * page states where the Clipboard API might be restricted.
 */
function copyToClipboard(text) {
  // Try the modern Clipboard API first
  navigator.clipboard.writeText(text).then(() => {
    console.log("Copied to clipboard:", text);
  }).catch(() => {
    // Fallback if the Clipboard API fails or lacks focus
    const textArea = document.createElement("textarea");
    textArea.value = text;
    
    // Ensure the textarea is part of the DOM but not visible
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    document.body.appendChild(textArea);
    
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      console.log("Copied via fallback:", text);
    } catch (err) {
      console.error('Fallback copy failed', err);
    }
    
    document.body.removeChild(textArea);
  });
}

// 2. Handle the Left-Click (Action Icon) -> Markdown Format
chrome.action.onClicked.addListener((tab) => {
  if (!tab.url) return; // Ignore internal browser pages like chrome://

  const markdownLink = `[${tab.title}](${tab.url})`;

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: copyToClipboard,
    args: [markdownLink]
  }).catch((err) => console.error("Script injection failed", err));
});

// 3. Handle the Right-Click (Context Menu) -> Raw URL
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "copy-raw-url") {
    if (!tab.url) return;

    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: copyToClipboard,
      args: [tab.url]
    }).catch((err) => console.error("Script injection failed", err));
  }
});