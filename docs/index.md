---
layout: home

title: PageFlow
titleTemplate: Your product lives between pages
description: Turn routes, real screens, navigation paths, and page tests into one living product map.

hero:
  name: PageFlow
  text: Your product lives between pages.
  tagline: A route table tells you where screens exist—not how the experience holds together. PageFlow maps real pages, navigation paths, and page tests on one living canvas.
  image:
    src: /pageflow-demo.svg
    alt: Animated PageFlow map reorganizing application pages and navigation paths
  actions:
    - theme: brand
      text: Get started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/fitoe/unplugin-pageflow

features:
  - icon: 🧭
    title: Stop reconstructing the product
    details: Replace tabs, router configs, and tribal knowledge with one navigable view of the application.
  - icon: ◫
    title: Work from the real interface
    details: Inspect same-origin page previews—not screenshots that drift away from the code.
  - icon: ⤳
    title: Expose broken journeys
    details: Make navigation hotspots and page relationships visible before fragmented flows reach users.
  - icon: ◈
    title: Make complexity legible
    details: Collapse deep route trees into groups, then move from the whole product to one focused flow.
  - icon: ✓
    title: Put tests where they matter
    details: See unit, component, and end-to-end tests in the context of the pages they protect.
  - icon: ⏻
    title: Leave production untouched
    details: Explore the product in development without shipping the PageFlow runtime to users.
---

## A route table is not a product map

As an application grows, its real structure disappears across router files, framework conventions, redirects, tabs, and team memory. Static flowcharts fall behind. Screenshots lose their connection to the code. The expensive gaps are usually not inside a page—they are between pages.

PageFlow rebuilds that missing context from the running application, giving engineers and product teams a shared view of what exists, how users move, and where confidence is thin.

## Start in minutes

```bash
pnpm add -D unplugin-pageflow
```

Add PageFlow to your development configuration, start the application, then open the URL printed by the plugin.

[Read the getting started guide →](/guide/getting-started)

## Explore PageFlow

### Learn the workflow

- [Understand pages, links, hotspots, previews, and route groups](/guide/concepts)
- [Navigate the infinite canvas](/guide/canvas)
- [Provide safe values for dynamic routes](/guide/dynamic-routes)
- [Preserve native controls and application state](/guide/state)

### Connect your development tools

- [Associate and run page tests](/guide/page-tests)
- [Scale to large projects with bounded rendering and caching](/guide/large-projects)
- [Learn how route discovery and previews work](/guide/how-it-works)

### Find answers

- [Check framework compatibility](/reference/compatibility)
- [Troubleshoot previews, routes, navigation, and tests](/guide/troubleshooting)
- [Read frequently asked questions](/guide/faq)
