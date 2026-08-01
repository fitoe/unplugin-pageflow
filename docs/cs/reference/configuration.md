# Konfigurace

Předejte možnosti adaptéru PageFlow:

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

## Možnosti

| Možnost | Výchozí | Popis |
| --- | --- | --- |
| `enabled` | `true` | Povolí PageFlow na vývojovém serveru. |
| `previewPath` | `/__unplugin-pageflow/` | URL používaná vizuální mapou. |
| `appUrl` | `/` | Trasa používaná ke zjištění routeru aplikace. |
| `dynamicParams` | `{}` | Poskytuje ukázkové hodnoty parametrů dynamických tras. |
| `pageTests` | `{}` | Explicitně spojuje globy tras s globy testovacích souborů. |
| `testCommands` | `{}` | Povolí spuštění každého typu testu explicitními příkazy bez shellu. |

## Testy stránek

PageFlow automaticky přiřazuje testy, které importují komponentu stránky, používají stejnojmenný testovací soubor nebo přecházejí na celou trasu v testovacím scénáři. Nejednoznačné testy lze mapovat explicitně:

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

`{file}` a `{name}` se nahrazují indexovaným testovacím souborem a názvem případu. Příkazy běží z kořene projektu s `shell: false`; žádný příkaz se ve výchozím stavu neodhaduje ani nepovoluje. Test má výchozí limit 120 sekund a `timeoutMs` přijímá 1 sekundu až 30 minut.

PageFlow ukládá posledních 500 výsledků do `.unplugin-pageflow/cache/test-results.json`. Změna obsahu testovacího souboru automaticky zneplatní předchozí výsledek. Uložený výstup je omezen na posledních 20 KB pro každý test; adresář cache má zůstat ignorovaný Gitem.

## Parametry dynamických tras

PageFlow potřebuje konkrétní hodnoty pro vykreslení trasy jako `/products/:id`:

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

Používejte bezpečné lokální nebo testovací identifikátory. Dynamické parametry neobcházejí ověřování aplikace.

## Připravenost náhledu

PageFlow před zachycením stránky čeká na písma, obrázky a klidný DOM. Stránka s dlouhou asynchronní prací může připravenost oznámit explicitně:

```ts
window.__UNPLUGIN_PAGEFLOW_READY__?.()
```
