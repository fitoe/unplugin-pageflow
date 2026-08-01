# Next.js

Next.js stellt keine Vite-Plugin-Schnittstelle bereit. Deshalb verwendet PageFlow einen Same-Origin-Sidecar ausschließlich für die Entwicklung.

## PageFlow vorbereiten

Das Paket als Entwicklungsabhängigkeit installieren und sicherstellen, dass die Next.js-Anwendung läuft.

```bash
pnpm add -D unplugin-pageflow
pnpm next dev
```

## Sidecar starten

Die CLI vom Anwendungsstamm ausführen:

```bash
pageflow-next --dir . --host 127.0.0.1 --port 3000
```

Die CLI erkennt unterstützte dateibasierte Next.js-Routen und gibt die PageFlow-URL aus.

## Optionen

- `--dir` wählt das Next.js-Projektverzeichnis.
- `--host` wählt den Entwicklungshost.
- `--port` bezeichnet den vom Sidecar verwendeten Next.js-Entwicklungsport.

## Nur für die Entwicklung

Der Sidecar ist kein Teil von `next build` und wird vom Produktionsserver nicht verwendet. Er gehört in lokale Entwicklungsskripte, nicht in Definitionen von Produktionsprozessen.

## Fehlerbehebung

- Next.js starten, bevor Seitenvorschauen geöffnet werden.
- Einen verfügbaren Host und Port verwenden.
- Prüfen, ob Seiten in derselben Browsersitzung direkt gerendert werden.
- Lokale oder Test-Authentifizierung und -Daten verwenden.
