# Concepts fondamentaux

PageFlow transforme les routes et destinations de navigation d’une application en graphe explorable. Cinq concepts suffisent pour comprendre l’interface.

## Pages

Une page représente une route concrète que PageFlow peut afficher. Les routes statiques sont disponibles immédiatement. Les routes dynamiques le deviennent après la définition de valeurs de paramètres représentatives.

Chaque page peut avoir un titre, un chemin, un aperçu, une miniature, des liens et des tests associés. Les paramètres de requête et fragments peuvent conserver un emplacement précis sans créer de route distincte.

## Liens de navigation

Un lien est une relation orientée entre deux pages. PageFlow détecte les liens des routeurs pris en charge, les ancres de même origine, les destinations programmatiques littérales, l’historique du navigateur et les indications explicites comme `data-pageflow-to`.

Une destination calculée peut rester inconnue jusqu’à l’exécution de l’interaction correspondante.

## Zones actives

Lorsqu’une page est sélectionnée, PageFlow met en évidence les éléments qui déclenchent une navigation connue. Ces zones relient l’aperçu au graphe et montrent où la transition commence dans l’interface réelle.

## Aperçus et miniatures

La page sélectionnée utilise un iframe actif de même origine. Les pages proches utilisent des captures afin de préserver la fluidité. Les miniatures en cache restent visibles pendant leur actualisation.

## Groupes de routes

Les grandes arborescences sont regroupées en piles. Ouvrez une pile pour voir ses enfants, puis utilisez le fil d’Ariane pour revenir. Le regroupement réduit le bruit sans perdre les relations.

## Ensuite

- [Apprendre à utiliser le canevas](/fr/guide/canvas)
- [Configurer les routes dynamiques](/fr/guide/dynamic-routes)
- [Comprendre le fonctionnement de PageFlow](/fr/guide/how-it-works)
