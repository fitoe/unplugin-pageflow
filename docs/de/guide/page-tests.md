# Seitentests

PageFlow kann Routen mit Unit-, Komponenten- und End-to-End-Tests verknüpfen und ausdrücklich konfigurierte Befehle von der ausgewählten Seite ausführen.

## Automatische Zuordnung

Ein Test kann zugeordnet werden, wenn er eine Seitenkomponente importiert, einer Gleichnamigkeitskonvention folgt oder im Testfall zur vollständigen Route navigiert. PageFlow zeigt den Grund jeder Zuordnung an.

## Explizite Zuordnungen

Bei mehrdeutiger automatischer Zuordnung Routen- und Datei-Globs verwenden.

```ts
PageFlow.vite({
  pageTests: {
    '/orders/**': ['tests/orders-*.spec.ts'],
  },
})
```

## Testbefehle

Standardmäßig wird kein Befehl erraten oder aktiviert. Jede unterstützte Testart ausdrücklich konfigurieren.

```ts
PageFlow.vite({
  testCommands: {
    unit: {
      command: 'pnpm',
      args: ['vitest', 'run', '{file}', '-t', '{name}'],
    },
    component: {
      command: 'pnpm',
      args: ['vitest', 'run', '{file}', '-t', '{name}'],
    },
    e2e: {
      command: 'pnpm',
      args: ['playwright', 'test', '{file}', '-g', '{name}'],
      timeoutMs: 180_000,
    },
  },
})
```

`{file}` und `{name}` werden durch indizierte Werte ersetzt. Befehle laufen vom Projektstamm mit `shell: false`. Ein Test hat standardmäßig 120 Sekunden Zeit; `timeoutMs` akzeptiert Werte von 1 Sekunde bis 30 Minuten.

## Ergebnisse

Das Seitenpanel meldet die Zustände unbekannt, läuft, bestanden, fehlgeschlagen, übersprungen oder abgebrochen. Ein laufender Test kann in PageFlow abgebrochen werden. Testausgaben bleiben Entwicklungssache und werden nie in das Produktions-Bundle aufgenommen.
