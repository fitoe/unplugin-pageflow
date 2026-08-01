# Conceitos fundamentais

O PageFlow transforma as rotas e os destinos de navegação de uma aplicação em um grafo explorável. Compreender cinco conceitos torna o restante da interface simples.

## Páginas

Uma página representa uma rota concreta que o PageFlow pode renderizar. Rotas estáticas ficam prontas imediatamente. Rotas dinâmicas tornam-se renderizáveis depois que você fornece valores representativos para os parâmetros.

Cada página pode ter título, caminho, prévia, miniatura, links de navegação e testes associados. Strings de consulta e hashes podem preservar um local de navegação mais específico sem criar definições de rota independentes.

## Links de navegação

Um link é uma relação direcionada de uma página para outra. O PageFlow pode descobrir links compatíveis do roteador, âncoras da mesma origem, destinos programáticos literais, navegação pelo histórico do navegador e indicações explícitas do framework, como `data-pageflow-to`.

Destinos calculados podem ser conhecidos somente depois que a aplicação realiza a interação correspondente.

## Pontos interativos

Quando uma página é selecionada, o PageFlow destaca os elementos que produzem uma navegação conhecida. Esses pontos conectam a prévia visual ao grafo: mostram não apenas que duas rotas estão relacionadas, mas onde a transição começa na interface real.

## Prévias e miniaturas

A página selecionada usa um iframe ativo da mesma origem. Outras páginas próximas usam prévias capturadas para manter a tela responsiva. Miniaturas em cache continuam visíveis enquanto páginas desatualizadas são atualizadas em segundo plano.

## Grupos de rotas

Árvores grandes de rotas são recolhidas em conjuntos. Entre em um conjunto para examinar seus filhos e use a trilha de navegação para retornar a um nível anterior. O agrupamento reduz o ruído visual sem descartar as relações entre páginas.

## A seguir

- [Aprenda os controles da tela](/pt/guide/canvas)
- [Configure rotas dinâmicas](/pt/guide/dynamic-routes)
- [Veja como o PageFlow funciona](/pt/guide/how-it-works)
