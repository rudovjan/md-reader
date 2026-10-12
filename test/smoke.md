# Welcome to MD Reader

A quiet place for your Markdown files. Double-click any `.md` file in Finder to start reading.

## The essentials

- **Open a file:** press ⌘O, or drag a file into the window.
- **Find text:** press ⌘F. Press Escape to dismiss search.
- **Make text larger:** press ⌘+; reset with ⌘0.
- **Switch theme:** use the circle button in the toolbar.
- **Jump between sections:** use the outline on the left.

Your document refreshes automatically when you save changes in another editor. Each document opens in its own window. MD Reader never edits your files.

## Markdown, comfortably rendered

> Less setup. More reading.

| Feature | Supported |
| --- | --- |
| Headings, lists, and quotes | Yes |
| Tables and code blocks | Yes |
| Relative images and Markdown links | Yes |
| Light and dark themes | Yes |

```js
const message = 'Hello, Markdown.';
console.log(message);
```

## Development

Run `npm install`, then `npm start`. Use `npm run build` to package the Apple Silicon macOS application. The installed copy lives at `~/Applications/MD Reader.app`.

The app uses Electron with sandboxed, isolated renderers and sanitizes rendered Markdown using DOMPurify. Local and HTTPS images are supported. This local build is not notarized and has no automatic update service.

<img src="missing.png" onerror="window.compromised=true">
<script>window.compromised=true</script>
