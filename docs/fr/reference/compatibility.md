# Compatibilité

PageFlow nécessite Node.js 20.19 ou plus récent et s’installe comme dépendance de développement.

| Intégration | Version peer minimale | Source des routes | Notes |
| --- | --- | --- | --- |
| Vite + Vue Router | Vite 5, Vue 3.4, Vue Router 4 | `router.getRoutes()` | Intégration complète au runtime de développement. |
| Nuxt | Nuxt 3 | Enregistrements Vue Router | Reconnaît les événements Nuxt/Vue. |
| Astro | Astro 5 | Routes de fichiers | Ancres de même origine et `data-pageflow-to`, sans internes d’island. |
| React Router | Objets de routes | Objets explicites | Utilisez `unplugin-pageflow/react-router`. |
| SvelteKit | SvelteKit 2 | Routes de fichiers | Se compose avec `sveltekit()`. |
| SolidStart | SolidStart | Routes de fichiers | Se compose avec le plugin Solid. |
| Qwik City | Qwik 1.10, Qwik City 1.10 | Routes de fichiers | Se compose avec Qwik City et Vite. |
| Next.js | Next.js 15 | Routes de fichiers | Utilise le sidecar `pageflow-next`. |
| uni-app | Configuration Vite actuelle | Routes générées | Développement uniquement. |

## Navigateurs

Les aperçus exigent un accès iframe de même origine et un navigateur moderne prenant en charge l’historique, la messagerie et canvas.

## Production

PageFlow n’a volontairement aucun runtime de production. Les builds ne doivent contenir ni son client ni ses endpoints de développement.

## Politique de versions

Les plages peer décrivent la frontière prise en charge. Consultez le manifeste et la CI avant d’adopter une nouvelle version majeure.
