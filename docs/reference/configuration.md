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
