---
layout: home

title: PageFlow
titleTemplate: Veja toda a sua aplicação de uma vez
description: Coloque todas as páginas e os caminhos entre elas em uma única tela clara e sempre atualizada.

hero:
  name: PageFlow
  text: Veja toda a sua aplicação de uma vez.
  tagline: À medida que as páginas se multiplicam, a navegação fica mais difícil de acompanhar. O PageFlow reúne todas as páginas e os caminhos entre elas em uma única tela clara.
  image:
    src: /pageflow-demo.svg?v=20260801-20
    alt: Mapa animado do PageFlow reorganizando páginas e caminhos de navegação da aplicação
  actions:
    - theme: brand
      text: Começar
      link: /pt/guide/getting-started
    - theme: alt
      text: Ver no GitHub
      link: https://github.com/fitoe/unplugin-pageflow

features:
  - icon: 🗺️
    title: O site inteiro
    details: Reúna todas as páginas em um mapa e entenda de relance até mesmo a estrutura de um site grande.
  - icon: 🖥️
    title: Páginas reais
    details: Veja a interface que o código realmente renderiza, sem depender de capturas e diagramas desatualizados.
  - icon: 🔀
    title: Fluxos entre páginas
    details: Acompanhe como as páginas se conectam e entenda rapidamente de onde as pessoas vêm e para onde podem ir.
  - icon: 🔌
    title: APIs das páginas
    details: Veja quais APIs cada página chama e inspecione o que elas realmente retornam.
  - icon: 🧪
    title: Testes das páginas
    details: Mantenha os testes junto às páginas para identificar com facilidade a cobertura e os riscos restantes.
  - icon: 🔄
    title: Sempre sincronizado
    details: Páginas, navegação, APIs e testes acompanham o desenvolvimento, sem um mapa do site mantido manualmente.
---

<FrameworkGrid bundler-title="Bundlers compatíveis" title="Frameworks compatíveis" link="/pt/integrations/" />

## Mais páginas, menos visibilidade

Conforme uma aplicação cresce, ninguém consegue enxergar tudo em um só lugar. Desenvolvedores leem arquivos de rotas, designers consultam protótipos, testadores seguem casos de teste e cada pessoa guarda parte do fluxo na cabeça. Essas visões rapidamente deixam de coincidir.

O PageFlow lê a aplicação em execução e organiza suas páginas e links reais. Uma única visão mostra o que existe, para onde os usuários podem ir e quais páginas possuem testes.

## Comece em poucos minutos

```bash
pnpm add -D unplugin-pageflow
```

Adicione o PageFlow à configuração de desenvolvimento, inicie a aplicação e abra a URL exibida pelo plugin.

[Leia o guia de primeiros passos →](/pt/guide/getting-started)

## Explore o PageFlow

### Entenda o fluxo de trabalho

- [Entenda páginas, links, pontos interativos, prévias e grupos de rotas](/pt/guide/concepts)
- [Navegue pela tela infinita](/pt/guide/canvas)
- [Forneça valores seguros para rotas dinâmicas](/pt/guide/dynamic-routes)
- [Preserve controles nativos e o estado da aplicação](/pt/guide/state)

### Conecte suas ferramentas de desenvolvimento

- [Associe e execute testes de páginas](/pt/guide/page-tests)
- [Escale projetos grandes com renderização e cache limitados](/pt/guide/large-projects)
- [Entenda como a descoberta de rotas e as prévias funcionam](/pt/guide/how-it-works)

### Encontre respostas

- [Consulte a compatibilidade com frameworks](/pt/reference/compatibility)
- [Resolva problemas de prévias, rotas, navegação e testes](/pt/guide/troubleshooting)
- [Leia as perguntas frequentes](/pt/guide/faq)
