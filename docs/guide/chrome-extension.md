# Chrome extension

[Download the PageFlow Chrome extension](/chrome/pageflow.crx)

The extension is distributed without the Chrome Web Store. Once installed, it periodically checks the PageFlow website and updates automatically.

The extension requests the `debugger` permission when installed or upgraded. It enables CDP network capture and high-resolution background screenshots; CDP contention, user cancellation, or attachment failure falls back to injected page capture. Chrome does not allow `debugger` as a runtime optional permission.

## Installation support

- Linux: download the CRX and install it using Chrome's self-hosted extension flow.
- Windows and macOS: Chrome blocks ordinary users from installing off-store CRX files. An organization administrator must deploy it with an enterprise policy such as `ExtensionInstallForcelist`.
- Local development: build the source, enable Developer mode at `chrome://extensions`, and choose **Load unpacked**. Unpacked extensions do not use online auto-update.

## Updates

Chrome reads the extension's `update_url` every few hours. When the website advertises a higher version, Chrome downloads the CRX signed by the same private key and replaces the installed version. The version is generated automatically from the root package SemVer and Git commit count.
