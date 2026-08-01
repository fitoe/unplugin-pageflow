# Kompatibilita

PageFlow vyžaduje Node.js 20.19 nebo novější. Nainstalujte jej jako vývojovou závislost.

| Integrace | Minimální peer verze | Zdroj tras | Poznámky |
| --- | --- | --- | --- |
| Vite + Vue Router | Vite 5, Vue 3.4, Vue Router 4 | `router.getRoutes()` | Úplná integrace s vývojovým runtime. |
| Nuxt | Nuxt 3 | Záznamy Vue Router | Rozpoznává navigační události Nuxt/Vue. |
| Astro | Astro 5 | Souborové trasy | Kotvy stejného původu a `data-pageflow-to`; bez vnitřku islands. |
| React Router | Objekty tras | Explicitní objekty tras | Použijte `unplugin-pageflow/react-router`. |
| SvelteKit | SvelteKit 2 | Souborové trasy | Adaptér se kombinuje se `sveltekit()`. |
| SolidStart | SolidStart | Souborové trasy | Adaptér se kombinuje s pluginem Solid. |
| Qwik City | Qwik 1.10, Qwik City 1.10 | Souborové trasy | Adaptér se kombinuje s Qwik City a Vite. |
| Next.js | Next.js 15 | Souborové trasy | Používá vývojový sidecar `pageflow-next`. |
| uni-app | Současné nastavení založené na Vite | Vygenerované trasy | Pouze pro vývoj. |

## Požadavky prohlížeče

Náhledy stránek vyžadují přístup k iframe stejného původu a moderní prohlížeč se standardní podporou history, messaging a canvas.

## Podpora produkce

PageFlow záměrně nemá produkční runtime. Produkční sestavení nesmí obsahovat jeho klienta ani vývojové endpointy.

## Zásady verzí

Peer rozsahy frameworků popisují hranice podporované integrace. Při přechodu na nové hlavní verze zkontrolujte manifest balíčku a CI.
