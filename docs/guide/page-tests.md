# Page tests

PageFlow can associate routes with unit, component, and end-to-end tests, then run explicitly configured commands from the selected page.

## Automatic association

A test can be associated when it imports a page component, follows a same-name convention, or navigates to the complete route in a test case. PageFlow shows why each association was created.

## Explicit mappings

Use route and file globs when automatic association is ambiguous.

```ts
PageFlow.vite({
  pageTests: {
    '/orders/**': ['tests/orders-*.spec.ts'],
  },
})
```

## Test commands

No command is guessed or enabled by default. Configure each supported test kind explicitly.

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

`{file}` and `{name}` are replaced with indexed values. Commands run from the project root with `shell: false`. A test has a 120-second default timeout; `timeoutMs` accepts 1 second through 30 minutes.

## Results

The page panel reports unknown, running, passed, failed, skipped, or cancelled states. A running test can be cancelled from PageFlow. Test output remains a development concern and is never included in the production bundle.

