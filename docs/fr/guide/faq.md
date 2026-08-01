# Questions fréquentes

## PageFlow fonctionne-t-il en production ?

Non. PageFlow est un outil de développement. Son runtime et ses endpoints sont exclus des builds de production.

## Remplace-t-il un routeur ou un outil de test ?

Non. Il lit les routes depuis les intégrations prises en charge et exécute uniquement les commandes de test configurées explicitement.

## Peut-il contourner l’authentification ?

Non. Les aperçus utilisent la session actuelle du navigateur et les autorisations normales de l’application.

## PageFlow clique-t-il automatiquement sur tous les contrôles ?

Non. Il détecte les destinations prises en charge, mais ne parcourt pas le produit en cliquant automatiquement.

## Pourquoi une destination calculée manque-t-elle ?

Une destination construite à l’exécution peut ne pas exister avant l’interaction correspondante. Préférez un lien pris en charge ou une indication explicite autorisée par l’adaptateur.

## Les aperçus peuvent-ils modifier des données ?

Le code de démarrage de l’application s’exécute toujours. Le mode aperçu bloque les ancres et formulaires dans le cadre contrôlé, mais ne peut empêcher les effets de bord d’initialisation. Utilisez des données locales ou de test.

## Où sont stockées les miniatures ?

Dans `.unplugin-pageflow/cache`. Ce dossier peut être supprimé lorsque le serveur de développement est arrêté.

## Quels frameworks sont pris en charge ?

Consultez la [matrice de compatibilité](/fr/reference/compatibility).

## Comment signaler un bug ?

Ouvrez une issue sur [GitHub](https://github.com/fitoe/unplugin-pageflow/issues) avec le framework, les versions, la configuration minimale, la route et les sorties de console utiles.
