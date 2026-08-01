# Funktionsweise von PageFlow

PageFlow verbindet Framework-spezifische Routenerkennung mit einem Framework-unabhängigen visuellen Client.

## 1. Routen erkennen

Der gewählte Adapter liest die Routenquelle des Frameworks. Vue Router und Nuxt stellen Router-Einträge bereit; dateibasierte Frameworks liefern Routen über ihre Build-Integrationen; React Router akzeptiert Routenobjekte; Next.js verwendet einen Entwicklungs-Sidecar.

## 2. Entwicklungslaufzeit starten

Das Plugin injiziert nur während des laufenden Entwicklungsservers eine kleine Laufzeit. Sie meldet Routeninformationen, sichtbare Navigationsziele, Seitentitel und Bereitschaft an den PageFlow-Endpunkt.

## 3. Echte Seiten rendern

PageFlow öffnet Same-Origin-Anwendungsseiten in kontrollierten iframes. Die ausgewählte Seite bleibt aktiv, während Hintergrundseiten in begrenzten Vorschaubild-Caches erfasst werden.

## 4. Navigation erkennen

Adapter erkennen unterstützte Framework-Links, Same-Origin-Anker, Verlaufsänderungen, literale programmatische Ziele und explizite Navigationshinweise. Der Client verwandelt diese Ziele in gerichtete Graphkanten und Vorschau-Hotspots.

## 5. Graph anordnen

LeaferJS rendert die Arbeitsfläche. Routenstapel vereinfachen große Pfadhierarchien, ein räumlicher Index begrenzt die Arbeit im Viewport und große Layouts können in einem Worker laufen.

## Produktions-Builds

PageFlow ist ausschließlich für die Entwicklung vorgesehen. Laufzeit-Endpunkte und visueller Client werden nicht in die Produktionsausgabe injiziert. Die Prüfung der Produktionsausgabe im Repository verifiziert diese Grenze.

## Sicherheitsgrenze

Der Vorschaumodus blockiert Ankernavigation und das Absenden von Formularen im kontrollierten Frame, kann Nebenwirkungen der Anwendungsinitialisierung jedoch nicht unterdrücken. Lokale oder Testdaten verwenden.
