# Configuration

Passez les options à l’adaptateur PageFlow :

```ts
PageFlow.vite({
  enabled: true,
  previewPath: '/__unplugin-pageflow/',
  appUrl: '/',
  dynamicParams: {
    '/products/:id': { id: 'demo-product' },
  },
})
```

## Options

| Option | Valeur par défaut | Description |
| --- | --- | --- |
| `enabled` | `true` | Active PageFlow dans le serveur de développement. |
| `previewPath` | `/__unplugin-pageflow/` | URL de la carte visuelle. |
| `appUrl` | `/` | Route utilisée pour découvrir le routeur. |
| `dynamicParams` | `{}` | Valeurs d’exemple des paramètres dynamiques. |
| `pageTests` | `{}` | Associe les globs de routes et de fichiers de test. |
| `testCommands` | `{}` | Active les commandes explicites par type de test. |

## Tests de pages

PageFlow associe les tests qui importent une page, utilisent le même nom ou naviguent vers la route complète. Les cas ambigus peuvent être mappés explicitement :

```ts
PageFlow.vite({
  pageTests: {
    '/orders/**': ['tests/orders-*.spec.ts'],
  },
  testCommands: {
    unit: { command: 'pnpm', args: ['vitest', 'run', '{file}', '-t', '{name}'] },
    component: { command: 'pnpm', args: ['vitest', 'run', '{file}', '-t', '{name}'] },
    e2e: { command: 'pnpm', args: ['playwright', 'test', '{file}', '-g', '{name}'], timeoutMs: 180_000 },
  },
})
```

`{file}` et `{name}` sont remplacés par le fichier et le cas indexés. Les commandes s’exécutent depuis la racine avec `shell: false`. Le délai par défaut est de 120 secondes et `timeoutMs` accepte de 1 seconde à 30 minutes.

PageFlow conserve les 500 derniers résultats dans `.unplugin-pageflow/cache/test-results.json`. Une modification du fichier invalide l’ancien résultat. La sortie persistée est limitée aux 20 derniers Ko par test.

## Paramètres de routes dynamiques

```ts
PageFlow.vite({
  dynamicParams: {
    '/products/:id': { id: 'demo-product' },
    '/users/:userId/orders/:orderId': {
      userId: 'alice',
      orderId: 'order-100',
    },
  },
})
```

Utilisez des identifiants locaux ou de test. Les paramètres dynamiques ne contournent pas l’authentification.

## Préparation de l’aperçu

PageFlow attend les polices, images et un DOM stable. Une page asynchrone longue peut signaler explicitement qu’elle est prête :

```ts
window.__UNPLUGIN_PAGEFLOW_READY__?.()
```
