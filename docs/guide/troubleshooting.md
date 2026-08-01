# Troubleshooting

## No routes appear

- Confirm you installed the adapter matching the application router.
- Check that PageFlow runs in the development server, not a production preview.
- For plain Vite setups without an inspectable router, provide explicit routes if supported by your integration.

## A dynamic page does not open

Add safe sample values to `dynamicParams`. Verify the route pattern and open the generated URL directly to expose authentication or loader redirects.

## A preview stays blank or loading

- Check the application console and network requests.
- Confirm the page can render in the current browser session.
- Wait for required fonts and images.
- For long-running asynchronous work, call `window.__UNPLUGIN_PAGEFLOW_READY__?.()` when the page is ready.

## Navigation is missing

PageFlow discovers supported links and literal destinations. Computed programmatic targets may only appear after the interaction occurs. Astro island internals are intentionally not inspected; use a same-origin anchor or `data-pageflow-to` when needed.

## Thumbnails look stale

Allow the capture queue to refresh visible pages. If the cache is no longer useful, stop the dev server and remove `.unplugin-pageflow/cache`.

## Authentication pages appear

Authentication comes from the current browser session. Sign in to the local application in the same session, or use the expected sign-in/access-denied page as the accurate preview.

## Tests are not associated

Check the automatic association rules, then add an explicit `pageTests` mapping. A test can only run when its kind has a configured `testCommands` entry.

## Next.js sidecar fails

Confirm the application is running, the sidecar host and port are available, and both surfaces use the expected same-origin setup. See the [Next.js guide](/en/integrations/next).

