# Utiliser le canevas

Le canevas PageFlow sert à explorer un graphe de routes, pas à modifier les données de l’application.

## Déplacer et zoomer

- Faites défiler ou utilisez le pavé tactile pour zoomer autour du pointeur.
- Glissez une zone vide pour déplacer la vue.
- Sélectionnez une carte pour afficher ses relations.
- Utilisez les contrôles de viewport pour comparer mobile et ordinateur.

## Mettre une page au premier plan

La sélection ramène les pages liées dans la vue, transforme l’aperçu en iframe actif et affiche les zones de navigation. Cette vue ciblée évite le bruit du graphe complet.

## Explorer les groupes

Les routes partageant des segments peuvent apparaître sous forme de pile. Ouvrez-la pour inspecter le niveau suivant. Un fil d’Ariane conserve le contexte actif.

## Lire les connexions

Les connexions sont orientées. Une ligne sortante indique que la page source contient un moyen connu d’atteindre la cible. L’absence de ligne ne prouve pas que la navigation est impossible : les destinations calculées ne sont découvertes qu’une fois exposées par l’application.

## Actualiser les aperçus

PageFlow capture les pages obsolètes dans une file bornée. La page sélectionnée et les pages visibles sont prioritaires. Les changements de routes et de liens passent par HMR, tandis que les anciennes miniatures restent affichées.

## Conseils

- Commencez par l’accueil ou la route d’entrée principale.
- Ouvrez un groupe à la fois dans les grandes applications.
- Utilisez des données de test avant d’ouvrir une page qui écrit à l’initialisation.
- Si une page ne devient jamais prête, ajoutez un [signal explicite](/fr/reference/configuration#préparation-de-laperçu).
