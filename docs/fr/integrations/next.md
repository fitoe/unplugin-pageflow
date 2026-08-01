# Next.js

Next.js n’expose pas de surface de plugin Vite ; PageFlow utilise donc un sidecar de développement de même origine.

## Préparer PageFlow

Installez le paquet comme dépendance de développement, puis démarrez l’application Next.js.

```bash
pnpm add -D unplugin-pageflow
pnpm next dev
```

## Démarrer le sidecar

Exécutez la CLI depuis la racine :

```bash
pageflow-next --dir . --host 127.0.0.1 --port 3000
```

La CLI découvre les routes de fichiers Next.js prises en charge et affiche l’URL PageFlow.

## Options

- `--dir` sélectionne le projet Next.js.
- `--host` sélectionne l’hôte de développement.
- `--port` indique le port Next.js utilisé par le sidecar.

## Développement uniquement

Le sidecar ne fait pas partie de `next build` et n’est pas utilisé par le serveur de production. Gardez-le dans les scripts locaux.

## Résolution des problèmes

- Démarrez Next.js avant les aperçus.
- Utilisez un hôte et un port disponibles.
- Vérifiez que les pages s’affichent directement dans la même session.
- Utilisez une authentification et des données locales ou de test.
