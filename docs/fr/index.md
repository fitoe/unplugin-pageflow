---
layout: home

title: PageFlow
titleTemplate: Visualisez tout votre site d’un coup
description: Réunissez chaque page et chaque parcours sur un canevas clair et toujours à jour.

hero:
  name: PageFlow
  text: Visualisez tout votre site d’un coup.
  tagline: Plus les pages se multiplient, plus les parcours deviennent difficiles à suivre. PageFlow réunit chaque page et chaque chemin sur un seul canevas.
  image:
    src: /pageflow-demo.svg?v=20260801-20
    alt: Animation PageFlow réorganisant les pages et les parcours de navigation
  actions:
    - theme: brand
      text: Commencer
      link: /fr/guide/getting-started
    - theme: alt
      text: Voir sur GitHub
      link: https://github.com/fitoe/unplugin-pageflow

features:
  - icon: 🗺️
    title: Tout le site
    details: Réunissez toutes les pages sur une carte et comprenez immédiatement la structure, même sur un grand site.
  - icon: 🖥️
    title: Pages réelles
    details: Voyez l’interface réellement produite par le code, sans dépendre de captures et de schémas obsolètes.
  - icon: 🔀
    title: Parcours de pages
    details: Suivez les liens entre les pages et comprenez d’où viennent les utilisateurs et où ils peuvent aller.
  - icon: 🔌
    title: API des pages
    details: Identifiez les API appelées par chaque page et inspectez leurs réponses réelles.
  - icon: 🧪
    title: Tests des pages
    details: Gardez les tests près des pages pour repérer rapidement la couverture et les risques restants.
  - icon: 🔄
    title: Toujours synchronisé
    details: Pages, navigation, API et tests suivent le développement sans plan de site maintenu à la main.
---

<FrameworkGrid bundler-title="Bundlers pris en charge" title="Frameworks pris en charge" link="/fr/integrations/" />

## Plus de pages, moins de visibilité

Quand une application grandit, personne n’en voit plus l’ensemble au même endroit. Les développeurs lisent les routes, les designers consultent les maquettes et les testeurs suivent leurs cas de test. Ces visions finissent vite par diverger.

PageFlow lit l’application en cours d’exécution et place ses vraies pages et leurs liens ensemble. Une seule vue permet de savoir ce qui existe, où l’utilisateur peut aller et quelles pages sont testées.

## Démarrer en quelques minutes

```bash
pnpm add -D unplugin-pageflow
```

Ajoutez PageFlow à la configuration de développement, démarrez l’application, puis ouvrez l’URL affichée par le plugin.

[Lire le guide de démarrage →](/fr/guide/getting-started)

## Explorer PageFlow

### Comprendre le fonctionnement

- [Pages, liens, zones actives, aperçus et groupes de routes](/fr/guide/concepts)
- [Utiliser le canevas infini](/fr/guide/canvas)
- [Configurer des valeurs sûres pour les routes dynamiques](/fr/guide/dynamic-routes)
- [Conserver les contrôles et l’état de l’application](/fr/guide/state)

### Relier les outils de développement

- [Associer et exécuter les tests de pages](/fr/guide/page-tests)
- [Gérer les grands projets et le cache](/fr/guide/large-projects)
- [Comprendre la découverte des routes et les aperçus](/fr/guide/how-it-works)

### Trouver une réponse

- [Consulter la compatibilité](/fr/reference/compatibility)
- [Résoudre les problèmes](/fr/guide/troubleshooting)
- [Lire la FAQ](/fr/guide/faq)
