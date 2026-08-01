# Grundkonzepte

PageFlow verwandelt Routen und Navigationsziele einer Anwendung in einen erkundbaren Graphen. Fünf Konzepte machen die übrige Oberfläche leicht verständlich.

## Seiten

Eine Seite steht für eine konkrete Route, die PageFlow rendern kann. Statische Routen sind sofort verfügbar. Dynamische Routen können gerendert werden, nachdem repräsentative Parameterwerte angegeben wurden.

Jede Seite kann einen Titel, Routenpfad, eine Vorschau, ein Vorschaubild, Navigationslinks und zugeordnete Tests besitzen. Query-Strings und Hashes können einen genaueren Navigationsort bewahren, ohne unabhängige Routendefinitionen zu erzeugen.

## Navigationslinks

Ein Link ist eine gerichtete Beziehung von einer Seite zu einer anderen. PageFlow erkennt unterstützte Router-Links, Same-Origin-Anker, literale programmatische Ziele, Navigation über den Browserverlauf und explizite Framework-Hinweise wie `data-pageflow-to`.

Berechnete Ziele werden möglicherweise erst bekannt, nachdem die Anwendung die entsprechende Interaktion ausgeführt hat.

## Hotspots

Ist eine Seite ausgewählt, hebt PageFlow Elemente hervor, die zu bekannten Navigationszielen führen. Hotspots verbinden die visuelle Vorschau mit dem Graphen: Sie zeigen nicht nur die Beziehung zweier Routen, sondern auch, wo der Übergang in der echten Oberfläche beginnt.

## Vorschauen und Vorschaubilder

Die ausgewählte Seite verwendet ein aktives Same-Origin-iframe. Andere nahe Seiten verwenden aufgenommene Vorschauen, damit die Arbeitsfläche reaktionsschnell bleibt. Zwischengespeicherte Vorschaubilder bleiben sichtbar, während veraltete Seiten im Hintergrund aktualisiert werden.

## Routengruppen

Große Routenbäume werden zu Stapeln zusammengefasst. Einen Stapel öffnen, um seine untergeordneten Elemente zu betrachten, und über die Brotkrümelnavigation zu einem Vorfahren zurückkehren. Die Gruppierung reduziert visuelles Rauschen, ohne Seitenbeziehungen zu verwerfen.

## Weiter

- [Steuerung der Arbeitsfläche kennenlernen](/de/guide/canvas)
- [Dynamische Routen konfigurieren](/de/guide/dynamic-routes)
- [Funktionsweise von PageFlow ansehen](/de/guide/how-it-works)
