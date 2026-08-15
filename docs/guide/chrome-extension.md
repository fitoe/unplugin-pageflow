# Chrome extension

[Download the unpacked extension ZIP](/chrome/pageflow.zip) · [Download the signed CRX for Linux](/chrome/pageflow.crx)

The extension is distributed without the Chrome Web Store. Once installed, it periodically checks the PageFlow website and updates automatically.

The extension requests the `debugger` permission when installed or upgraded. It enables CDP network capture and high-resolution background screenshots; CDP contention, user cancellation, or attachment failure falls back to injected page capture. Chrome does not allow `debugger` as a runtime optional permission.

## Installation support

- Windows and macOS: download and extract the ZIP, open `chrome://extensions`, enable **Developer mode**, then choose **Load unpacked** and select the extracted folder. Reload the folder manually after downloading a newer ZIP.
- Linux: download the CRX and install it using Chrome's self-hosted extension flow. This signed build receives online updates.
- Enterprise: deploy the signed CRX and update manifest with `ExtensionInstallForcelist` or the equivalent managed-browser policy.
- Local development: build the source and load `packages/chrome-extension/.output/chrome-mv3` as an unpacked extension.

The extension reads only the active tab you explicitly open in PageFlow. `debugger` enables request inspection and high-resolution background capture; captured page state remains in the browser unless you explicitly export it.

## Updates

Chrome reads the extension's `update_url` every few hours. When the website advertises a higher version, Chrome downloads the CRX signed by the same private key and replaces the installed version. The version is generated automatically from the root package SemVer and Git commit count.
