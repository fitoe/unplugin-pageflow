# Configuração

Passe opções ao adaptador do PageFlow:

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

## Opções

| Opção | Padrão | Descrição |
| --- | --- | --- |
| `enabled` | `true` | Habilita o PageFlow no servidor de desenvolvimento. |
| `previewPath` | `/__unplugin-pageflow/` | URL usada pelo mapa visual. |
| `appUrl` | `/` | Rota usada para descobrir o roteador da aplicação. |
| `dynamicParams` | `{}` | Fornece valores de exemplo para parâmetros de rotas dinâmicas. |
| `pageTests` | `{}` | Associa explicitamente globs de rota a globs de arquivos de teste. |
| `testCommands` | `{}` | Habilita a execução por tipo de teste com comandos explícitos sem shell. |

## Testes de páginas

O PageFlow associa automaticamente testes que importam um componente de página, usam um arquivo de teste com o mesmo nome ou navegam para a rota completa em um caso de teste. Testes ambíguos podem ser mapeados explicitamente:

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

`{file}` e `{name}` são substituídos pelo arquivo e nome do caso indexados. Os comandos são executados na raiz do projeto com `shell: false`; nenhum comando de teste é deduzido ou habilitado por padrão. Um teste pode durar 120 segundos por padrão, e `timeoutMs` define um limite de 1 segundo a 30 minutos.

O PageFlow armazena os últimos 500 resultados em `.unplugin-pageflow/cache/test-results.json`. Uma alteração no conteúdo do arquivo de teste invalida automaticamente seu resultado anterior. A saída persistida é limitada aos 20 KB finais de cada teste; o diretório de cache deve continuar ignorado pelo Git.

## Parâmetros de rotas dinâmicas

O PageFlow precisa de valores concretos para renderizar uma rota como `/products/:id`:

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

Use identificadores locais ou de teste seguros. Parâmetros dinâmicos não ignoram a autenticação da aplicação.

## Prontidão da prévia

O PageFlow aguarda fontes, imagens e um DOM estável antes de capturar uma página. Uma página com trabalho assíncrono demorado pode sinalizar explicitamente que está pronta:

```ts
window.__UNPLUGIN_PAGEFLOW_READY__?.()
```
