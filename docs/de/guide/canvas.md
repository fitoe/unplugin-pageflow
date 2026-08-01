# Die Arbeitsfläche verwenden

Die PageFlow-Arbeitsfläche dient zum Erkunden eines Routengraphen, nicht zum Bearbeiten von Anwendungsdaten.

## Verschieben und zoomen

- Scrollen oder ein Trackpad verwenden, um um den Zeiger herum zu zoomen.
- Leere Bereiche ziehen, um den sichtbaren Ausschnitt zu verschieben.
- Eine Seitenkarte auswählen, um sie zu fokussieren und ihre Beziehungen sichtbar zu machen.
- Mit den Viewport-Steuerelementen mobile und Desktop-Vorschauen vergleichen.

## Eine Seite fokussieren

Beim Auswählen einer Seite werden verbundene Seiten sichtbar, die gewählte Vorschau wird zu einem aktiven iframe und Navigations-Hotspots erscheinen. Die Fokusansicht ist nützlich, wenn der vollständige Graph mehr Kontext enthält als benötigt.

## Routengruppen erkunden

Routen mit gemeinsamen Pfadsegmenten können als Stapel erscheinen. Den Stapel öffnen, um die nächste Ebene zu untersuchen. PageFlow behält eine Brotkrümelnavigation für die aktive Gruppe und animiert Ebenenwechsel, damit der aktuelle Kontext klar bleibt.

## Verbindungen lesen

Verbindungen sind gerichtet. Eine ausgehende Linie bedeutet, dass die Quellseite einen bekannten Weg zum Ziel enthält. Eine fehlende Linie bedeutet nicht immer, dass keine Navigation möglich ist: Berechnete Ziele werden erst erkannt, wenn die Anwendung sie offenlegt.

## Vorschauen aktualisieren

PageFlow nimmt veraltete Seiten in einer begrenzten Warteschlange neu auf. Die ausgewählte und sichtbare Seiten erhalten Vorrang. Änderungen an Routen und Links werden über HMR übertragen; vorhandene Vorschaubilder bleiben sichtbar, bis Ersatz bereitsteht.

## Tipps

- Bei der Startseite oder primären Einstiegsroute beginnen.
- In großen Anwendungen jeweils nur eine Routengruppe öffnen.
- Testdaten verwenden, bevor Seiten fokussiert werden, die bei der Initialisierung schreiben.
- Wird eine Seite nie bereit, ein [explizites Bereitschaftssignal](/de/reference/configuration#bereitschaft-der-vorschau) hinzufügen.
