# Häufig gestellte Fragen

## Läuft PageFlow in Produktion?

Nein. PageFlow ist ein Entwicklungswerkzeug. Laufzeit und Endpunkte werden aus Produktions-Builds ausgeschlossen.

## Ersetzt es einen Router oder Test-Runner?

Nein. Es liest Routen aus unterstützten Integrationen und führt nur ausdrücklich konfigurierte Testbefehle aus.

## Kann es die Authentifizierung umgehen?

Nein. Vorschauen verwenden die aktuelle Browsersitzung und die normale Autorisierung der Anwendung.

## Klickt PageFlow automatisch jedes Steuerelement an?

Nein. Es erkennt unterstützte Navigationsziele, durchsucht das Produkt aber nicht durch automatisches Anklicken von Steuerelementen.

## Warum fehlt ein berechnetes Ziel?

Ein zur Laufzeit zusammengesetztes Ziel existiert möglicherweise erst nach der entsprechenden Interaktion. Einen unterstützten Link verwenden oder einen expliziten Hinweis bereitstellen, sofern der Framework-Adapter dies erlaubt.

## Können Vorschauen Daten verändern?

Initialisierungscode der Anwendung wird weiterhin ausgeführt. Der Vorschaumodus blockiert Ankernavigation und das Absenden von Formularen im kontrollierten Frame, kann Nebenwirkungen der Initialisierung jedoch nicht verhindern. Lokale oder Testdaten verwenden.

## Wo werden Vorschaubilder gespeichert?

Dauerhafte Vorschaubilder liegen in `.unplugin-pageflow/cache`. Das Verzeichnis kann bei gestopptem Entwicklungsserver sicher gelöscht werden.

## Welche Frameworks werden unterstützt?

Siehe die aktuelle [Kompatibilitätsmatrix](/de/reference/compatibility).

## Wie melde ich einen Fehler?

Auf [GitHub](https://github.com/fitoe/unplugin-pageflow/issues) ein Issue mit Framework, Versionen, Minimalkonfiguration, Routenmuster und relevanter Konsolenausgabe erstellen.
