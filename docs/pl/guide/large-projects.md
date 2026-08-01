# Duże projekty i pamięć podręczna

PageFlow nie renderuje jednocześnie każdej trasy jako aktywnego dokumentu. Strategia renderowania i pamięci jest ograniczona, dzięki czemu duże grafy pozostają wygodne do przeglądania.

## Renderowanie viewportu

Montowane są tylko pobliskie podglądy DOM i obiekty sceny LeaferJS. Odległe strony używają kompaktowych reprezentacji. Jedna wybrana strona jest promowana do aktywnego iframe.

## Poziomy miniatur

Pobliskie strony mogą używać szczegółowych podglądów. Odległe korzystają z kompaktowych miniatur WebP, a długie strony można dzielić na kafelki montowane w viewport. Nieaktualne miniatury pozostają widoczne podczas przechwytywania nowych.

## Kolejka przechwytywania

Przed przechwyceniem PageFlow czeka na fonty, obrazy i stabilny DOM. Praca odbywa się po jednej stronie, z priorytetem dla wybranej i widocznych stron.

## Układ i wyszukiwanie

Grafy powyżej 1 000 stron mogą przenieść układ do Workera. Indeks przestrzenny znajduje widoczne strony bez skanowania całego grafu przy każdej aktualizacji viewportu.

## Lokalizacja pamięci

Trwałe miniatury są przechowywane w:

```text
.unplugin-pageflow/cache
```

Pamięć RAM i dyskowa używają stałych limitów LRU. Katalog jest usuwalnym wynikiem deweloperskim i można go skasować, gdy potrzebne jest całkowicie nowe przechwycenie.

## Praktyczne wskazówki

- Grupuj trasy za pomocą znaczących segmentów ścieżki.
- Podawaj stabilne przykłady parametrów dynamicznych.
- Utrzymuj deterministyczne podglądy dzięki danym fixture.
- Używaj sygnału gotowości dla długich stron asynchronicznych.
