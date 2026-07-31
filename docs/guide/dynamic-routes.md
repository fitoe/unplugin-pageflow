# Dynamic routes

A route such as `/products/:id` cannot be rendered until PageFlow knows a safe value for `id`. Configure representative values with `dynamicParams`.

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

## Matching

Use the route pattern exposed by the framework adapter as the object key. Every named parameter required by that pattern should have a value.

## Query strings and hashes

PageFlow keeps discovered query strings and hashes as navigation locations. They can represent tabs, filters, or anchors while the underlying route remains the same.

```text
/products/demo-product?tab=history#activity
```

## Choosing sample values

Use stable identifiers backed by local fixtures or test data. Avoid production customer IDs and pages that can perform irreversible writes during initialization.

Dynamic parameters only construct a URL. They do not bypass authentication, authorization, loaders, or application validation.

## Troubleshooting

If a dynamic page still does not render:

1. Confirm the configured key exactly matches the framework route pattern.
2. Provide every required parameter.
3. Open the generated URL directly in the same browser session.
4. Check whether authentication or a loader redirects the request.

