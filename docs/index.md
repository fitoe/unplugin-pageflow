---
layout: home

title: PageFlow
titleTemplate: See your whole app at once
description: Put every page and every path between them on one clear, always-current canvas.

hero:
  name: PageFlow
  text: See your whole app at once.
  tagline: As pages multiply, navigation gets harder to follow. PageFlow puts every page and every path between them on one clear canvas.
  image:
    src: /pageflow-demo.svg?v=20260801-6
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
    title: Every page, one view
    details: Stop opening files and browser tabs just to remember what the app contains.
  - icon: ◫
    title: See the real page
    details: Preview the interface your code actually renders, not an old screenshot or diagram.
  - icon: ⤳
    title: Follow every path
    details: See where a button or link goes and how one page leads to the next.
  - icon: ◈
    title: Keep large apps readable
    details: Group related pages and zoom from the whole app into one part of the flow.
  - icon: ✓
    title: Find the tests for a page
    details: See and run the unit, component, and end-to-end tests connected to each page.
  - icon: ⏻
    title: Development only
    details: Use PageFlow while building the app. Nothing is added to the production experience.
---

## More pages, less visibility

As an app grows, no one sees all of it in one place. Developers read route files, designers check mockups, testers follow test cases, and everyone keeps part of the flow in their head. Those views quickly drift apart.

PageFlow reads the running app and lays out its real pages and links together. Open one view to understand what exists, where users can go, and which pages have tests.

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
