# Primeiros passos

O PageFlow é um mapa visual, exclusivo para desenvolvimento, das rotas e dos caminhos de navegação de uma aplicação.

## Requisitos

- Node.js 20.19 ou mais recente
- Uma integração de framework compatível
- Dados locais ou de teste para páginas que realizam gravações durante a inicialização

## Instalação

```bash
pnpm add -D unplugin-pageflow
```

## Configure o Vite

Para uma aplicação Vite que usa Vue Router:

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

## Abra o PageFlow

Inicie o servidor de desenvolvimento normalmente:

```bash
pnpm dev
```

O terminal exibe a URL de prévia:

```text
unplugin-pageflow  http://localhost:5173/__unplugin-pageflow/
```

Abra essa URL para explorar o mapa de rotas. Role para ampliar, arraste a tela para se mover e selecione uma página para examinar suas relações.

## Próximos passos

- [Escolha outra integração de framework](/pt/integrations/)
- [Configure parâmetros de rotas dinâmicas](/pt/reference/configuration#parâmetros-de-rotas-dinâmicas)
- [Consulte as limitações e a segurança das prévias](/pt/reference/limitations)
