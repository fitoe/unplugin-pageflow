# Compatibilidade

O PageFlow requer Node.js 20.19 ou mais recente. Instale-o como dependência de desenvolvimento.

| Integração | Versão peer mínima | Fonte das rotas | Observações |
| --- | --- | --- | --- |
| Vite + Vue Router | Vite 5, Vue 3.4, Vue Router 4 | `router.getRoutes()` | Integração completa com o runtime de desenvolvimento. |
| Nuxt | Nuxt 3 | Registros do Vue Router | Reconhece eventos de navegação Nuxt/Vue. |
| Astro | Astro 5 | Rotas baseadas em arquivos | Âncoras da mesma origem e `data-pageflow-to`; sem elementos internos de islands. |
| React Router | Objetos de rota | Objetos de rota explícitos | Use `unplugin-pageflow/react-router`. |
| SvelteKit | SvelteKit 2 | Rotas baseadas em arquivos | O adaptador é combinado com `sveltekit()`. |
| SolidStart | SolidStart | Rotas baseadas em arquivos | O adaptador é combinado com o plugin Solid. |
| Qwik City | Qwik 1.10, Qwik City 1.10 | Rotas baseadas em arquivos | O adaptador é combinado com Qwik City e Vite. |
| Next.js | Next.js 15 | Rotas baseadas em arquivos | Usa o sidecar de desenvolvimento `pageflow-next`. |
| uni-app | Configuração atual baseada em Vite | Rotas geradas | Somente desenvolvimento. |

## Requisitos do navegador

As prévias exigem acesso a iframes da mesma origem e um navegador moderno com suporte padrão a histórico, mensagens e canvas.

## Suporte em produção

O PageFlow não possui um runtime de produção por decisão de projeto. Builds de produção não devem conter seu cliente nem seus endpoints de desenvolvimento.

## Política de versões

Os intervalos peer dos frameworks definem os limites das integrações compatíveis. Verifique o manifesto do pacote e a CI ao adotar novas versões principais dos frameworks.
