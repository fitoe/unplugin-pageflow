# Einschränkungen und Sicherheit

PageFlow rendert während der Entwicklung echte Anwendungsseiten. Vorschauen wie normale Besuche der lokalen Anwendung behandeln.

## Was PageFlow tut

- Erkennt Routen, die der ausgewählte Framework-Adapter bereitstellt.
- Rendert Same-Origin-Seitenvorschauen.
- Erkennt unterstützte Links und Navigationsziele.
- Blockiert Ankernavigation und Formularübermittlung im Vorschaumodus.
- Hält seine Laufzeit aus Produktions-Builds heraus.

## Was PageFlow nicht tut

- Es umgeht weder Authentifizierung noch Autorisierung.
- Es klickt Steuerelemente nicht automatisch an.
- Es unterdrückt keine Nebenwirkungen beim Anwendungsstart.
- Es kann nicht jedes berechnete Ziel vor der relevanten Interaktion ableiten.
- Es untersucht keine Interna von Astro Islands.

## Sichere Daten verwenden

Für Seiten, die während der Initialisierung schreiben, lokale oder Testdaten verwenden. Keine echten Passwörter, Tokens, Bestätigungscodes oder anderen Geheimnisse als Vorschauzustand konfigurieren.

Authentifizierung und routenspezifischer Zustand stammen aus der aktuellen Browsersitzung. Eine Seite ohne Berechtigung kann die normale Anmelde- oder Zugriff-verweigert-Ansicht rendern.
