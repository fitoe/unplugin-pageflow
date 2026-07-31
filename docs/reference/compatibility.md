# Compatibility

PageFlow requires Node.js 20.19 or newer. Install it as a development dependency.

| Integration | Minimum peer version | Route source | Notes |
| --- | --- | --- | --- |
| Vite + Vue Router | Vite 5, Vue 3.4, Vue Router 4 | `router.getRoutes()` | Full development runtime integration. |
| Nuxt | Nuxt 3 | Vue Router records | Recognizes Nuxt/Vue navigation events. |
| Astro | Astro 5 | File routes | Same-origin anchors and `data-pageflow-to`; no island internals. |
| React Router | Route objects | Explicit route objects | Use `unplugin-pageflow/react-router`. |
| SvelteKit | SvelteKit 2 | File routes | Adapter composes with `sveltekit()`. |
| SolidStart | SolidStart | File routes | Adapter composes with the Solid plugin. |
| Qwik City | Qwik 1.10, Qwik City 1.10 | File routes | Adapter composes with Qwik City and Vite. |
| Next.js | Next.js 15 | File routes | Uses the `pageflow-next` development sidecar. |
| uni-app | Current Vite-based setup | Generated routes | Development use only. |

## Browser requirements

Page previews require same-origin iframe access and a modern browser with standard history, messaging, and canvas support.

## Production support

PageFlow intentionally has no production runtime. Production builds should not contain its client or development endpoints.

## Version policy

Framework peer ranges describe the supported integration boundary. Check the package manifest and CI when adopting newer major framework versions.
