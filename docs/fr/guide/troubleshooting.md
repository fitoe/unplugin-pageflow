# Résolution des problèmes

## Aucune route n’apparaît

- Vérifiez que l’adaptateur correspond au routeur de l’application.
- Exécutez PageFlow dans le serveur de développement, pas dans un aperçu de production.
- Pour un Vite simple sans routeur inspectable, fournissez des routes explicites si l’intégration le permet.

## Une page dynamique ne s’ouvre pas

Ajoutez des valeurs sûres dans `dynamicParams`, vérifiez le modèle de route et ouvrez directement l’URL pour révéler une redirection d’authentification ou de loader.

## L’aperçu reste vide ou en chargement

- Vérifiez la console et le réseau.
- Confirmez que la page fonctionne dans la session actuelle.
- Attendez les polices et images requises.
- Pour un traitement asynchrone long, appelez `window.__UNPLUGIN_PAGEFLOW_READY__?.()` lorsque la page est prête.

## Une navigation manque

Les destinations calculées peuvent apparaître uniquement après l’interaction. Les internes des islands Astro ne sont pas inspectés ; utilisez une ancre de même origine ou `data-pageflow-to`.

## Les miniatures sont anciennes

Laissez la file actualiser les pages visibles. Si nécessaire, arrêtez le serveur et supprimez `.unplugin-pageflow/cache`.

## Des pages d’authentification apparaissent

L’authentification vient de la session actuelle. Connectez-vous à l’application locale dans la même session. Sans permission, la page de connexion ou de refus est l’aperçu exact.

## Les tests ne sont pas associés

Vérifiez les règles automatiques, puis ajoutez un mappage `pageTests`. Un test ne peut s’exécuter que si son type possède une entrée `testCommands`.

## Le sidecar Next.js échoue

Vérifiez que l’application tourne, que l’hôte et le port sont disponibles et que les deux surfaces utilisent la même origine. Consultez le [guide Next.js](/fr/integrations/next).
