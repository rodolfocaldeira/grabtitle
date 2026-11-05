# Grab Title

A lightweight Chrome extension that copies the current page, or any image, as a ready-to-paste Markdown link.

## Features

| Action | Result |
| --- | --- |
| Click the toolbar icon | Copies the page as a Markdown link: `[Page Title](https://example.com)` |
| Right-click the toolbar icon → **Copy URL only** | Copies just the page URL |
| Right-click the toolbar icon → **Copy as Rich Link** | Copies a clickable link (HTML) with a Markdown plain-text fallback, so it pastes as a live link in Docs, Notion, Slack, email, etc. |
| Right-click an image → **Copy Image as Markdown** | Copies `![alt text](https://example.com/image.png)` |

### Details

- Image alt text is taken from the image's `alt` attribute, falling back to its `title`, then to `image`.
- Titles, alt text and URLs are escaped so special characters (`[`, `]`, `\`, spaces, parentheses, `<`, `&`, quotes) don't break the Markdown or HTML output.
- Works on `http` and `https` pages. Browser-internal pages such as `chrome://` are not supported.

## Installation

The extension is not yet on the Chrome Web Store. To install it from source:

1. Clone or download this repository.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select the project folder.
5. Pin **Grab Title** from the extensions menu for one-click access.

After pulling changes, click the reload icon on the extension's card to apply them.

## Permissions

| Permission | Why it's needed |
| --- | --- |
| `activeTab` | Access the current tab when you click the icon or use the context menu |
| `scripting` | Run a small script in the page to write to the clipboard and read an image's alt text |
| `contextMenus` | Add the menu items listed above |

Grab Title makes no network requests and stores no data.

## Project structure

```
background.js   Service worker: menus, escaping helpers, clipboard logic
manifest.json   Extension manifest (Manifest V3)
icon.png        Extension icon
```

## Credits

- Icons: [Swarm icons by Sonya](https://www.iconarchive.com/show/swarm-icons-by-sonya.html)
