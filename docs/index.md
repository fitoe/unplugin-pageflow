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
    src: /pageflow-demo.svg?v=20260801-20
    alt: Animated PageFlow map reorganizing application pages and navigation paths
  actions:
    - theme: brand
      text: Get started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/fitoe/unplugin-pageflow

features:
  - icon: 🗺️
    title: The whole site
    details: Bring every page into one map and understand the structure of even a large website at a glance.
  - icon: 🖥️
    title: Real pages
    details: See the interface your code actually renders instead of relying on outdated screenshots and diagrams.
  - icon: 🔀
    title: Page flows
    details: Follow how pages connect and quickly understand where people come from and where they can go.
  - icon: 🔌
    title: Page APIs
    details: See which APIs each page calls and inspect what those APIs actually return.
  - icon: 🧪
    title: Page tests
    details: Keep tests beside their pages so coverage and remaining risks are easy to spot.
  - icon: 🔄
    title: Always in sync
    details: Pages, navigation, APIs, and tests update with development, without a hand-maintained site map.
---

<FrameworkGrid bundler-title="Supported bundlers" title="Supported frameworks" link="/integrations/" />

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
