# Configuration

Pass options to the PageFlow adapter:

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

| Option | Default | Description |
| --- | --- | --- |
| `enabled` | `true` | Enables PageFlow in the development server. |
| `previewPath` | `/__unplugin-pageflow/` | URL used by the visual map. |
| `appUrl` | `/` | Route used to discover the application router. |
| `dynamicParams` | `{}` | Supplies sample values for dynamic route parameters. |
| `pageTests` | `{}` | Explicitly associates route globs with test file globs. |
| `testCommands` | `{}` | Enables test execution per test kind with explicit shell-free commands. |

## Page tests

PageFlow automatically associates tests that import a page component, use a same-name test file, or navigate to the complete route inside a test case. Ambiguous tests can be mapped explicitly:

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

`{file}` and `{name}` are replaced with the indexed test file and case name. Commands run from the project root with `shell: false`; no test command is guessed or enabled by default. One test may run for 120 seconds by default, and `timeoutMs` can set a limit from 1 second to 30 minutes.

PageFlow stores the latest 500 test results in `.unplugin-pageflow/cache/test-results.json`. A test-file content change invalidates its previous result automatically. Persisted output is limited to the final 20 KB per test; the cache directory should remain ignored by Git.

## Dynamic route parameters

PageFlow needs concrete values to render a route such as `/products/:id`:

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

Use safe local or test identifiers. Dynamic parameters do not bypass application authentication.

## Preview readiness

PageFlow waits for fonts, images, and a quiet DOM before capturing a page. A page with long-running asynchronous work can explicitly signal readiness:

```ts
window.__UNPLUGIN_PAGEFLOW_READY__?.()
```
