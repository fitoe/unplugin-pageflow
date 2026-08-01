# Grands projets et cache

PageFlow n’affiche pas chaque route comme document actif au même moment. Le rendu et le cache sont bornés pour garder les grands graphes explorables.

## Rendu du viewport

Seuls les aperçus DOM et objets LeaferJS proches sont montés. Les pages éloignées utilisent une représentation compacte et une seule page sélectionnée devient un iframe actif.

## Niveaux de miniatures

Les pages proches peuvent utiliser des aperçus détaillés. Les pages éloignées utilisent de petites miniatures WebP ; les longues pages peuvent être découpées en tuiles. Les anciennes images restent visibles pendant le remplacement.

## File de capture

PageFlow attend les polices, images et un DOM stable. Une page est traitée à la fois, avec priorité à la sélection et aux pages visibles.

## Disposition et recherche

Au-delà de 1 000 pages, la disposition peut passer dans un Worker. Un index spatial trouve les pages visibles sans parcourir tout le graphe.

## Emplacement du cache

```text
.unplugin-pageflow/cache
```

Les caches mémoire et disque utilisent des budgets LRU fixes. Le dossier est une sortie de développement supprimable.

## Conseils pratiques

- Regroupez les routes avec des segments significatifs.
- Fournissez des paramètres dynamiques stables.
- Rendez les aperçus déterministes avec des fixtures.
- Utilisez le signal de préparation pour les pages asynchrones longues.
