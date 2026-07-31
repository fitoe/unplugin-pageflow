# Next.js

Next.js does not expose a Vite plugin surface, so PageFlow uses a development-only same-origin sidecar.

## Build PageFlow

Install the package as a development dependency, then make sure the Next.js application is running.

```bash
pnpm add -D unplugin-pageflow
pnpm next dev
```

## Start the sidecar

Run the CLI from the application root:

```bash
pageflow-next --dir . --host 127.0.0.1 --port 3000
```

The CLI discovers supported Next.js file routes and prints the PageFlow URL.

## Options

- `--dir` selects the Next.js project directory.
- `--host` selects the development host.
- `--port` identifies the Next.js development port used by the sidecar setup.

## Development only

The sidecar is not part of `next build` and is not used by the production server. Keep it in local development scripts rather than production process definitions.

## Troubleshooting

- Start Next.js before opening page previews.
- Use an available host and port.
- Confirm pages render directly in the same browser session.
- Use local or test authentication and data.

