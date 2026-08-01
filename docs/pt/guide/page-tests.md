# Testes de páginas

O PageFlow pode associar rotas a testes unitários, de componentes e de ponta a ponta, e executar comandos configurados explicitamente a partir da página selecionada.

## Associação automática

Um teste pode ser associado quando importa um componente de página, segue uma convenção de mesmo nome ou navega para a rota completa em um caso de teste. O PageFlow mostra o motivo de cada associação.

## Mapeamentos explícitos

Use globs de rota e arquivo quando a associação automática for ambígua.

```ts
PageFlow.vite({
  pageTests: {
    '/orders/**': ['tests/orders-*.spec.ts'],
  },
})
```

## Comandos de teste

Nenhum comando é deduzido ou habilitado por padrão. Configure explicitamente cada tipo de teste compatível.

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

`{file}` e `{name}` são substituídos pelos valores indexados. Os comandos são executados na raiz do projeto com `shell: false`. O tempo limite padrão é de 120 segundos; `timeoutMs` aceita de 1 segundo a 30 minutos.

## Resultados

O painel da página informa os estados desconhecido, em execução, aprovado, reprovado, ignorado ou cancelado. Um teste em execução pode ser cancelado pelo PageFlow. A saída dos testes permanece restrita ao desenvolvimento e nunca é incluída no bundle de produção.
