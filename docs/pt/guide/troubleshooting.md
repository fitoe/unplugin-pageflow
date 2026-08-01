# Solução de problemas

## Nenhuma rota aparece

- Confirme que você instalou o adaptador correspondente ao roteador da aplicação.
- Verifique se o PageFlow está no servidor de desenvolvimento, não em uma prévia de produção.
- Em configurações Vite simples sem um roteador inspecionável, forneça rotas explícitas se a integração permitir.

## Uma página dinâmica não abre

Adicione valores de exemplo seguros a `dynamicParams`. Confira o padrão da rota e abra diretamente a URL gerada para revelar redirecionamentos de autenticação ou loader.

## Uma prévia permanece vazia ou carregando

- Consulte o console da aplicação e as solicitações de rede.
- Confirme que a página pode ser renderizada na sessão atual do navegador.
- Aguarde o carregamento das fontes e imagens necessárias.
- Em tarefas assíncronas demoradas, chame `window.__UNPLUGIN_PAGEFLOW_READY__?.()` quando a página estiver pronta.

## A navegação está ausente

O PageFlow descobre links compatíveis e destinos literais. Destinos programáticos calculados podem aparecer somente após a interação. Elementos internos de islands do Astro não são inspecionados intencionalmente; use uma âncora da mesma origem ou `data-pageflow-to` quando necessário.

## As miniaturas estão desatualizadas

Permita que a fila de captura atualize as páginas visíveis. Se o cache não for mais útil, pare o servidor de desenvolvimento e remova `.unplugin-pageflow/cache`.

## Páginas de autenticação aparecem

A autenticação vem da sessão atual do navegador. Entre na aplicação local na mesma sessão ou considere a página esperada de login ou acesso negado como a prévia correta.

## Os testes não são associados

Confira as regras de associação automática e adicione um mapeamento explícito em `pageTests`. Um teste só pode ser executado se o seu tipo tiver uma entrada configurada em `testCommands`.

## O sidecar do Next.js falha

Confirme que a aplicação está em execução, que o host e a porta do sidecar estão disponíveis e que as duas interfaces usam a configuração esperada de mesma origem. Consulte o [guia do Next.js](/pt/integrations/next).
