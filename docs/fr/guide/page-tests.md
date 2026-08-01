# Tests de pages

PageFlow peut associer les routes à des tests unitaires, de composants et end-to-end, puis lancer les commandes configurées depuis la page sélectionnée.

## Association automatique

Un test peut être associé s’il importe un composant de page, suit une convention de nom ou navigue vers la route complète. PageFlow affiche la raison de chaque association.

## Mappages explicites

```ts
PageFlow.vite({
  pageTests: {
    '/orders/**': ['tests/orders-*.spec.ts'],
  },
})
```

## Commandes de test

Aucune commande n’est devinée ni activée par défaut. Configurez chaque type explicitement.

```ts
PageFlow.vite({
  testCommands: {
    unit: {
      command: 'pnpm',
      args: ['vitest', 'run', '{file}', '-t', '{name}'],
    },
    component: {
      command: 'pnpm',
      args: ['vitest', 'run', '{file}', '-t', '{name}'],
    },
    e2e: {
      command: 'pnpm',
      args: ['playwright', 'test', '{file}', '-g', '{name}'],
      timeoutMs: 180_000,
    },
  },
})
```

`{file}` et `{name}` sont remplacés par les valeurs indexées. Les commandes partent de la racine avec `shell: false`. Le délai par défaut est de 120 secondes ; `timeoutMs` accepte de 1 seconde à 30 minutes.

## Résultats

Le panneau indique les états inconnu, en cours, réussi, échoué, ignoré ou annulé. Un test en cours peut être annulé. Les sorties ne sont jamais incluses dans le bundle de production.
