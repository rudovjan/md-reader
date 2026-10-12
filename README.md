# Welcome to MD Reader

A quiet place for your Markdown files. Double-click any `.md` file in Finder to start reading.

## Download

[Download the latest macOS app](https://github.com/rudovjan/md-reader/releases/latest) (Apple Silicon, macOS 13+). Unzip the download and move **MD Reader.app** to Applications. Builds are not Developer ID signed or notarized.

## The essentials

- **Open a file:** press ⌘O, or drag a file into the window.
- **Edit / preview:** click Edit or press ⌘E for Markdown source on the left and a live preview on the right. Click Read to return to reading. Save with ⌘S.
- **Find text:** press ⌘F. Press Escape to dismiss search.
- **Make text larger:** press ⌘+; reset with ⌘0.
- **Switch theme:** use the circle button in the toolbar.
- **Jump between sections:** use the outline on the left.

Your document refreshes automatically when you save changes in another editor. Each document opens in its own window. Unsaved edits are protected when closing a window. If the file changes in another editor, saving asks before overwriting those changes.

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

Requires Node.js 22.12 or newer. The packaged app targets Apple Silicon Macs running macOS 13 or newer.

```sh
npm install
npm start
npm test
npm run build
```

The build is created at `dist/MD Reader-darwin-arm64/MD Reader.app`. Copy it into `~/Applications` and open it. To make it your default Markdown app, select a `.md` file in Finder, choose **Get Info → Open with → MD Reader → Change All**.

On macOS, the optional association script can also register the installed app:

```sh
swift scripts/associate.swift "$HOME/Applications/MD Reader.app" "$PWD/README.md"
```

The app icon is included. To regenerate it, run `swift scripts/icon.swift assets/reader.iconset/icon_512x512@2x.png`, create the 512px version using `sips`, then use `iconutil` to rebuild `assets/reader.icns`.

The app uses Electron with sandboxed, isolated renderers and sanitizes rendered Markdown using DOMPurify. Local and HTTPS images are supported. This local build is not notarized and has no automatic update service.

## Releases

GitHub Actions builds and publishes the app ZIP and SHA-256 checksum when a version tag is pushed:

```sh
git tag v1.0.1
git push origin v1.0.1
```

The workflow uses a standard macOS runner, which is free for this public repository, and uploads directly to GitHub Releases. Generated `dist/` files stay out of Git history.
