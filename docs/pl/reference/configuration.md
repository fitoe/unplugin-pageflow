# Konfiguracja

Przekaż opcje do adaptera PageFlow:

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

## Opcje

| Opcja | Domyślnie | Opis |
| --- | --- | --- |
| `enabled` | `true` | Włącza PageFlow na serwerze deweloperskim. |
| `previewPath` | `/__unplugin-pageflow/` | URL używany przez mapę wizualną. |
| `appUrl` | `/` | Trasa używana do wykrycia routera aplikacji. |
| `dynamicParams` | `{}` | Dostarcza przykładowe wartości parametrów tras dynamicznych. |
| `pageTests` | `{}` | Jawnie łączy globy tras z globami plików testowych. |
| `testCommands` | `{}` | Włącza wykonanie każdego typu testu jawnymi poleceniami bez shell. |

## Testy stron

PageFlow automatycznie przypisuje testy, które importują komponent strony, używają pliku testowego o tej samej nazwie lub przechodzą do pełnej trasy w przypadku testowym. Niejednoznaczne testy można mapować jawnie:

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

`{file}` i `{name}` są zastępowane zindeksowanym plikiem testowym i nazwą przypadku. Polecenia działają z katalogu głównego projektu z `shell: false`; domyślnie żadne polecenie nie jest zgadywane ani włączane. Test może domyślnie trwać 120 sekund, a `timeoutMs` przyjmuje limit od 1 sekundy do 30 minut.

PageFlow przechowuje ostatnich 500 wyników w `.unplugin-pageflow/cache/test-results.json`. Zmiana zawartości pliku testowego automatycznie unieważnia poprzedni wynik. Zachowany wynik jest ograniczony do ostatnich 20 KB na test; katalog pamięci powinien pozostać ignorowany przez Git.

## Parametry tras dynamicznych

PageFlow potrzebuje konkretnych wartości do wyrenderowania trasy takiej jak `/products/:id`:

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

Używaj bezpiecznych lokalnych lub testowych identyfikatorów. Parametry dynamiczne nie obchodzą uwierzytelniania aplikacji.

## Gotowość podglądu

PageFlow przed przechwyceniem strony czeka na fonty, obrazy i stabilny DOM. Strona z długą pracą asynchroniczną może jawnie zasygnalizować gotowość:

```ts
window.__UNPLUGIN_PAGEFLOW_READY__?.()
```
