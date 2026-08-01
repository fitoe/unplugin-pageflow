# Vite + Vue Router

O adaptador Vite oferece a integração mais direta do PageFlow para uma aplicação Vue Router.

## Instalação

```bash
pnpm add -D unplugin-pageflow
```

## Configuração

```ts
// vite.config.ts
import vue from '@vitejs/plugin-vue'
import PageFlow from 'unplugin-pageflow'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    vue(),
    PageFlow.vite(),
  ],
})
```

Inicie o Vite normalmente e abra a URL do PageFlow exibida no terminal.

## Descoberta de rotas

O runtime de desenvolvimento lê `router.getRoutes()`. Ele reconhece links do Vue Router e destinos literais de `router.push()` ou `router.replace()`, e atualiza alterações de rotas e links por Vite HMR.

## Rotas dinâmicas

```ts
PageFlow.vite({
  dynamicParams: {
    '/products/:id': { id: 'demo-product' },
  },
})
```

## Estado da página

Controles nativos e posições de rolagem podem ser restaurados automaticamente. Use [`definePageFlowState`](/pt/guide/state) para estados Vue específicos da aplicação.

## Limitações

- Destinos calculados ficam disponíveis somente depois que a aplicação os expõe.
- A autenticação vem da sessão atual do navegador.
- Efeitos colaterais da inicialização continuam sendo executados nas prévias.
