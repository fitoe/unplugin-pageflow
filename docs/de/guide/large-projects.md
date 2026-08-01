# Große Projekte und Caching

PageFlow rendert nicht jede Route gleichzeitig als aktives Dokument. Rendering und Caching sind begrenzt, damit große Graphen erkundbar bleiben.

## Viewport-Rendering

Nur nahe DOM-Vorschauen und LeaferJS-Szenenobjekte werden eingebunden. Entfernte Seiten verwenden kompakte Darstellungen. Eine ausgewählte Seite wird zu einem aktiven iframe hochgestuft.

## Vorschaubild-Stufen

Nahe Seiten können detaillierte Vorschauen verwenden. Entfernte Seiten nutzen kompakte WebP-Vorschaubilder; lange Seiten können in Viewport-gemountete Kacheln aufgeteilt werden. Veraltete Vorschaubilder bleiben sichtbar, während Ersatz aufgenommen wird.

## Aufnahme-Warteschlange

Vor einer Aufnahme wartet PageFlow auf Schriftarten, Bilder und ein ruhiges DOM. Seiten werden einzeln verarbeitet; ausgewählte und sichtbare Seiten haben Vorrang.

## Layout und Suche

Bei Graphen mit mehr als 1.000 Seiten kann die Layoutarbeit in einen Worker verlagert werden. Ein räumlicher Index findet sichtbare Seiten, ohne bei jeder Viewport-Aktualisierung den gesamten Graphen zu durchsuchen.

## Cache-Speicherort

Dauerhafte Vorschaubilder werden hier gespeichert:

```text
.unplugin-pageflow/cache
```

Arbeitsspeicher- und Festplatten-Caches verwenden feste LRU-Budgets. Das Verzeichnis ist entbehrliche Entwicklungsausgabe und kann für eine vollständig neue Aufnahme entfernt werden.

## Praktische Hinweise

- Routen mit aussagekräftigen Pfadsegmenten gruppieren.
- Stabile Beispielwerte für dynamische Parameter angeben.
- Vorschauseiten mit Fixture-Daten deterministisch halten.
- Für lang laufende asynchrone Seiten das Bereitschaftssignal verwenden.
