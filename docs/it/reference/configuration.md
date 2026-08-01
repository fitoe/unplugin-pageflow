# Configurazione

Passa le opzioni all'adattatore PageFlow:

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

## Opzioni

| Opzione | Predefinito | Descrizione |
| --- | --- | --- |
| `enabled` | `true` | Abilita PageFlow nel server di sviluppo. |
| `previewPath` | `/__unplugin-pageflow/` | URL usato dalla mappa visiva. |
| `appUrl` | `/` | Rotta usata per rilevare il router dell'applicazione. |
| `dynamicParams` | `{}` | Fornisce valori di esempio per i parametri delle rotte dinamiche. |
| `pageTests` | `{}` | Associa esplicitamente glob di rotte a glob di file di test. |
| `testCommands` | `{}` | Abilita l'esecuzione per tipo di test con comandi espliciti senza shell. |

## Test delle pagine

PageFlow associa automaticamente i test che importano un componente di pagina, usano un file di test con lo stesso nome o navigano verso la rotta completa in un caso di test. I test ambigui possono essere mappati esplicitamente:

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

`{file}` e `{name}` vengono sostituiti con il file di test e il nome del caso indicizzati. I comandi sono eseguiti dalla radice del progetto con `shell: false`; nessun comando viene dedotto o abilitato per impostazione predefinita. Un test può durare 120 secondi per impostazione predefinita e `timeoutMs` accetta un limite da 1 secondo a 30 minuti.

PageFlow conserva gli ultimi 500 risultati in `.unplugin-pageflow/cache/test-results.json`. Una modifica al contenuto del file di test invalida automaticamente il risultato precedente. L'output persistente è limitato agli ultimi 20 KB per test; il percorso della cache deve restare ignorato da Git.

## Parametri delle rotte dinamiche

PageFlow necessita di valori concreti per renderizzare una rotta come `/products/:id`:

```ts
PageFlow.vite({
  dynamicParams: {
    '/products/:id': {
      id: 'demo-product',
    },
    '/users/:userId/orders/:orderId': {
      userId: 'alice',
      orderId: 'order-100',
    },
  },
})
```

Usa identificatori locali o di test sicuri. I parametri dinamici non aggirano l'autenticazione dell'applicazione.

## Disponibilità dell'anteprima

PageFlow attende font, immagini e un DOM stabile prima di acquisire una pagina. Una pagina con attività asincrone lunghe può segnalare esplicitamente la propria disponibilità:

```ts
window.__UNPLUGIN_PAGEFLOW_READY__?.()
```
