# Kompatibilität

PageFlow benötigt Node.js 20.19 oder neuer und wird als Entwicklungsabhängigkeit installiert.

| Integration | Minimale Peer-Version | Routenquelle | Hinweise |
| --- | --- | --- | --- |
| Vite + Vue Router | Vite 5, Vue 3.4, Vue Router 4 | `router.getRoutes()` | Vollständige Integration in die Entwicklungslaufzeit. |
| Nuxt | Nuxt 3 | Vue-Router-Einträge | Erkennt Nuxt-/Vue-Navigationsereignisse. |
| Astro | Astro 5 | Dateibasierte Routen | Same-Origin-Anker und `data-pageflow-to`; keine Island-Interna. |
| React Router | Routenobjekte | Explizite Routenobjekte | `unplugin-pageflow/react-router` verwenden. |
| SvelteKit | SvelteKit 2 | Dateibasierte Routen | Adapter wird mit `sveltekit()` kombiniert. |
| SolidStart | SolidStart | Dateibasierte Routen | Adapter wird mit dem Solid-Plugin kombiniert. |
| Qwik City | Qwik 1.10, Qwik City 1.10 | Dateibasierte Routen | Adapter wird mit Qwik City und Vite kombiniert. |
| Next.js | Next.js 15 | Dateibasierte Routen | Verwendet den Entwicklungs-Sidecar `pageflow-next`. |
| uni-app | Aktuelle Vite-basierte Konfiguration | Erzeugte Routen | Nur zur Entwicklung. |

## Browseranforderungen

Seitenvorschauen benötigen Same-Origin-Zugriff auf iframes und einen modernen Browser mit standardmäßiger Unterstützung für History, Messaging und Canvas.

## Produktionsunterstützung

PageFlow besitzt bewusst keine Produktionslaufzeit. Produktions-Builds dürfen weder Client noch Entwicklungsendpunkte enthalten.

## Versionsrichtlinie

Die Peer-Bereiche der Frameworks beschreiben die Grenze der unterstützten Integration. Beim Einsatz neuer Framework-Hauptversionen Paketmanifest und CI prüfen.
