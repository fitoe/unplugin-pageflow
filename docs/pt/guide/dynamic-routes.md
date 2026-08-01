# Rotas dinâmicas

Uma rota como `/products/:id` não pode ser renderizada até que o PageFlow conheça um valor seguro para `id`. Configure valores representativos com `dynamicParams`.

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

## Correspondência

Use como chave do objeto o padrão de rota exposto pelo adaptador do framework. Todo parâmetro nomeado exigido pelo padrão deve ter um valor.

## Strings de consulta e hashes

O PageFlow preserva strings de consulta e hashes descobertos como locais de navegação. Eles podem representar abas, filtros ou âncoras enquanto a rota subjacente permanece a mesma.

```text
/products/demo-product?tab=history#activity
```

## Escolhendo valores de exemplo

Use identificadores estáveis baseados em fixtures locais ou dados de teste. Evite IDs de clientes de produção e páginas que possam realizar gravações irreversíveis durante a inicialização.

Parâmetros dinâmicos apenas constroem uma URL. Eles não ignoram autenticação, autorização, loaders nem validações da aplicação.

## Solução de problemas

Se uma página dinâmica ainda não for renderizada:

1. Confirme que a chave configurada corresponde exatamente ao padrão de rota do framework.
2. Forneça todos os parâmetros obrigatórios.
3. Abra diretamente a URL gerada na mesma sessão do navegador.
4. Verifique se a autenticação ou um loader redireciona a solicitação.
