# Compatibilità

PageFlow richiede Node.js 20.19 o successivo. Installalo come dipendenza di sviluppo.

| Integrazione | Versione peer minima | Fonte delle rotte | Note |
| --- | --- | --- | --- |
| Vite + Vue Router | Vite 5, Vue 3.4, Vue Router 4 | `router.getRoutes()` | Integrazione completa con il runtime di sviluppo. |
| Nuxt | Nuxt 3 | Record di Vue Router | Riconosce gli eventi di navigazione Nuxt/Vue. |
| Astro | Astro 5 | Rotte basate su file | Ancore della stessa origine e `data-pageflow-to`; nessun elemento interno degli island. |
| React Router | Oggetti di rotta | Oggetti di rotta espliciti | Usa `unplugin-pageflow/react-router`. |
| SvelteKit | SvelteKit 2 | Rotte basate su file | L'adattatore si combina con `sveltekit()`. |
| SolidStart | SolidStart | Rotte basate su file | L'adattatore si combina con il plugin Solid. |
| Qwik City | Qwik 1.10, Qwik City 1.10 | Rotte basate su file | L'adattatore si combina con Qwik City e Vite. |
| Next.js | Next.js 15 | Rotte basate su file | Usa il sidecar di sviluppo `pageflow-next`. |
| uni-app | Configurazione attuale basata su Vite | Rotte generate | Solo sviluppo. |

## Requisiti del browser

Le anteprime richiedono accesso iframe della stessa origine e un browser moderno con supporto standard per cronologia, messaggistica e canvas.

## Supporto in produzione

PageFlow non ha intenzionalmente un runtime di produzione. Le build di produzione non devono contenere il client né gli endpoint di sviluppo.

## Politica delle versioni

Gli intervalli peer dei framework descrivono i confini delle integrazioni supportate. Controlla il manifesto del pacchetto e la CI quando adotti nuove versioni principali dei framework.
