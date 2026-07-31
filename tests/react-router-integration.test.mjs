import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'

test('flattens React Router framework and data routes without losing hierarchy', async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const { resolveReactRouterRoutes } = await server.ssrLoadModule('/src/react-router/index.ts')
    assert.deepEqual(resolveReactRouterRoutes([
      { index: true, file: 'routes/home.tsx', title: 'Home' },
      { id: 'products', path: 'products', file: 'routes/products.tsx', children: [
        { id: 'product', path: ':id', file: 'routes/product.tsx' },
      ] },
      { path: '/about', file: 'routes/about.tsx' },
    ]), [
      { id: 'routes/home.tsx', name: undefined, path: '/', title: 'Home', componentFile: 'routes/home.tsx' },
      { id: 'products', name: 'products', path: '/products', title: 'products', componentFile: 'routes/products.tsx' },
      { id: 'product', name: 'product', path: '/products/:id', title: 'product', componentFile: 'routes/product.tsx' },
      { id: 'routes/about.tsx', name: undefined, path: '/about', title: 'about', componentFile: 'routes/about.tsx' },
    ])
  } finally {
    await server.close()
  }
})
