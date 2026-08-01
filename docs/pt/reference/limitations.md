# Limitações e segurança

O PageFlow renderiza páginas reais da aplicação durante o desenvolvimento. Trate as prévias como visitas normais à aplicação local.

## O que o PageFlow faz

- Descobre rotas expostas pelo adaptador de framework selecionado.
- Renderiza prévias de páginas da mesma origem.
- Detecta links e destinos de navegação compatíveis.
- Bloqueia navegação por âncoras e envio de formulários no modo de prévia.
- Mantém seu runtime fora dos builds de produção.

## O que o PageFlow não faz

- Não ignora autenticação nem autorização.
- Não clica automaticamente nos controles.
- Não elimina efeitos colaterais da inicialização da aplicação.
- Não consegue deduzir todo destino calculado antes da interação relevante.
- Não inspeciona elementos internos dos islands de frameworks no Astro.

## Use dados seguros

Use dados locais ou de teste em páginas que realizam gravações durante a inicialização. Não configure senhas, tokens, códigos de verificação nem outros segredos reais como estado de prévia.

A autenticação e o estado específico da rota vêm da sessão atual do navegador. Uma página sem permissão pode renderizar a experiência normal de login ou acesso negado.
