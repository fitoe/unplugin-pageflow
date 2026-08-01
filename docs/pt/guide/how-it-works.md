# Como o PageFlow funciona

O PageFlow combina a descoberta de rotas específica de cada framework com um cliente visual independente de framework.

## 1. Descobrir rotas

O adaptador selecionado lê a fonte de rotas do framework. Vue Router e Nuxt expõem registros do roteador; frameworks baseados em arquivos fornecem rotas pelas integrações de build; React Router aceita objetos de rota; Next.js usa um sidecar de desenvolvimento.

## 2. Iniciar o runtime de desenvolvimento

O plugin injeta um pequeno runtime somente enquanto o servidor de desenvolvimento está em execução. Ele informa ao endpoint do PageFlow os dados das rotas, os destinos de navegação visíveis, os títulos das páginas e a prontidão.

## 3. Renderizar páginas reais

O PageFlow abre páginas da aplicação com a mesma origem em iframes controlados. A página selecionada permanece ativa, enquanto páginas em segundo plano são capturadas em caches limitados de miniaturas.

## 4. Detectar a navegação

Os adaptadores reconhecem links compatíveis do framework, âncoras da mesma origem, alterações no histórico, destinos programáticos literais e indicações explícitas de navegação. O cliente transforma esses destinos em arestas direcionadas do grafo e pontos interativos da prévia.

## 5. Organizar o grafo

O LeaferJS renderiza a tela. Conjuntos de rotas simplificam grandes hierarquias de caminhos, um índice espacial limita o trabalho na viewport e layouts grandes podem ser executados em um Worker.

## Builds de produção

O PageFlow é exclusivo para desenvolvimento. Seus endpoints de runtime e cliente visual não são injetados na saída de produção. A verificação da saída de produção do repositório confirma esse limite.

## Limite de segurança

O modo de prévia bloqueia a navegação por âncoras e o envio de formulários no frame controlado, mas não consegue eliminar efeitos colaterais da inicialização da aplicação. Use dados locais ou de teste.
