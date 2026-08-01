# Fehlerbehebung

## Keine Routen sichtbar

- Prüfen, ob der zum Anwendungsrouter passende Adapter installiert ist.
- Sicherstellen, dass PageFlow im Entwicklungsserver läuft, nicht in einer Produktionsvorschau.
- Bei einfachem Vite ohne untersuchbaren Router explizite Routen angeben, sofern die Integration dies unterstützt.

## Eine dynamische Seite öffnet sich nicht

Sichere Beispielwerte zu `dynamicParams` hinzufügen. Das Routenmuster prüfen und die erzeugte URL direkt öffnen, um Weiterleitungen durch Authentifizierung oder Loader sichtbar zu machen.

## Eine Vorschau bleibt leer oder lädt dauerhaft

- Anwendungskonsole und Netzwerkanfragen prüfen.
- Sicherstellen, dass die Seite in der aktuellen Browsersitzung gerendert werden kann.
- Auf benötigte Schriftarten und Bilder warten.
- Bei lang laufender asynchroner Arbeit `window.__UNPLUGIN_PAGEFLOW_READY__?.()` aufrufen, sobald die Seite bereit ist.

## Navigation fehlt

PageFlow erkennt unterstützte Links und literale Ziele. Berechnete programmatische Ziele erscheinen möglicherweise erst nach der Interaktion. Interna von Astro Islands werden bewusst nicht untersucht; bei Bedarf einen Same-Origin-Anker oder `data-pageflow-to` verwenden.

## Vorschaubilder sind veraltet

Der Aufnahme-Warteschlange Zeit geben, sichtbare Seiten zu aktualisieren. Ist der Cache nicht mehr nützlich, den Entwicklungsserver stoppen und `.unplugin-pageflow/cache` entfernen.

## Authentifizierungsseiten erscheinen

Die Authentifizierung stammt aus der aktuellen Browsersitzung. In derselben Sitzung bei der lokalen Anwendung anmelden oder die erwartete Anmelde-/Zugriff-verweigert-Seite als korrekte Vorschau betrachten.

## Tests werden nicht zugeordnet

Die Regeln der automatischen Zuordnung prüfen und anschließend eine explizite `pageTests`-Zuordnung hinzufügen. Ein Test kann nur laufen, wenn für seine Art ein `testCommands`-Eintrag konfiguriert ist.

## Next.js-Sidecar schlägt fehl

Prüfen, ob die Anwendung läuft, Host und Port des Sidecars verfügbar sind und beide Oberflächen die erwartete Same-Origin-Konfiguration verwenden. Siehe [Next.js-Anleitung](/de/integrations/next).
