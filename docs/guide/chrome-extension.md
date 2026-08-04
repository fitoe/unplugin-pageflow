# Chrome extension

[Download the PageFlow Chrome extension](/chrome/pageflow.crx)

The extension is distributed without the Chrome Web Store. Once installed, it periodically checks the PageFlow website and updates automatically.

## Installation support

- Linux: download the CRX and install it using Chrome's self-hosted extension flow.
- Windows and macOS: Chrome blocks ordinary users from installing off-store CRX files. An organization administrator must deploy it with an enterprise policy such as `ExtensionInstallForcelist`.
- Local development: build the source, enable Developer mode at `chrome://extensions`, and choose **Load unpacked**. Unpacked extensions do not use online auto-update.

## Updates

Chrome reads the extension's `update_url` every few hours. When the website advertises a higher version, Chrome downloads the CRX signed by the same private key and replaces the installed version. Before publishing a release, increase the `version` in `packages/chrome-extension/package.json`.
