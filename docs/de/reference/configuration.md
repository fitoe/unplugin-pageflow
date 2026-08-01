# Konfiguration

Optionen an den PageFlow-Adapter übergeben:

```ts
PageFlow.vite({
  enabled: true,
  previewPath: '/__unplugin-pageflow/',
  appUrl: '/',
  dynamicParams: {
    '/products/:id': { id: 'demo-product' },
  },
})
```

## Optionen

| Option | Standardwert | Beschreibung |
| --- | --- | --- |
| `enabled` | `true` | Aktiviert PageFlow im Entwicklungsserver. |
| `previewPath` | `/__unplugin-pageflow/` | Von der visuellen Karte verwendete URL. |
| `appUrl` | `/` | Route zum Erkennen des Anwendungsrouters. |
| `dynamicParams` | `{}` | Liefert Beispielwerte für dynamische Routenparameter. |
| `pageTests` | `{}` | Verknüpft Routen-Globs ausdrücklich mit Testdatei-Globs. |
| `testCommands` | `{}` | Aktiviert die Testausführung je Testart mit expliziten shell-freien Befehlen. |

## Seitentests

PageFlow ordnet Tests automatisch zu, wenn sie eine Seitenkomponente importieren, eine gleichnamige Testdatei verwenden oder in einem Testfall zur vollständigen Route navigieren. Mehrdeutige Tests können ausdrücklich zugeordnet werden:

```ts
PageFlow.vite({
  pageTests: {
    '/orders/**': ['tests/orders-*.spec.ts'],
  },
  testCommands: {
    unit: { command: 'pnpm', args: ['vitest', 'run', '{file}', '-t', '{name}'] },
    component: { command: 'pnpm', args: ['vitest', 'run', '{file}', '-t', '{name}'] },
    e2e: { command: 'pnpm', args: ['playwright', 'test', '{file}', '-g', '{name}'], timeoutMs: 180_000 },
  },
})
```

`{file}` und `{name}` werden durch die indizierte Testdatei und den Fallnamen ersetzt. Befehle laufen vom Projektstamm mit `shell: false`; standardmäßig wird kein Testbefehl erraten oder aktiviert. Ein Test darf standardmäßig 120 Sekunden laufen; `timeoutMs` setzt ein Limit von 1 Sekunde bis 30 Minuten.

PageFlow speichert die letzten 500 Testergebnisse in `.unplugin-pageflow/cache/test-results.json`. Eine Inhaltsänderung der Testdatei macht ihr vorheriges Ergebnis automatisch ungültig. Gespeicherte Ausgabe ist auf die letzten 20 KB je Test begrenzt; das Cache-Verzeichnis sollte von Git ignoriert bleiben.

## Parameter für dynamische Routen

PageFlow benötigt konkrete Werte, um eine Route wie `/products/:id` zu rendern:

```ts
PageFlow.vite({
  dynamicParams: {
    '/products/:id': {
      id: 'demo-product',
    },
    '/users/:userId/orders/:orderId': {
      userId: 'alice',
      orderId: 'order-100',
    },
  },
})
```

Sichere lokale oder Testkennungen verwenden. Dynamische Parameter umgehen nicht die Authentifizierung der Anwendung.

## Bereitschaft der Vorschau

PageFlow wartet vor der Seitenaufnahme auf Schriftarten, Bilder und ein ruhiges DOM. Eine Seite mit lang laufender asynchroner Arbeit kann ihre Bereitschaft ausdrücklich melden:

```ts
window.__UNPLUGIN_PAGEFLOW_READY__?.()
```
