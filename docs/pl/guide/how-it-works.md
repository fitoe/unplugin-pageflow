# Jak działa PageFlow

PageFlow łączy wykrywanie tras specyficzne dla frameworka z niezależnym klientem wizualnym.

## 1. Wykrywanie tras

Wybrany adapter odczytuje źródło tras frameworka. Vue Router i Nuxt udostępniają rekordy routera; frameworki plikowe przekazują trasy przez integracje buildu; React Router przyjmuje obiekty tras; Next.js używa deweloperskiego sidecara.

## 2. Uruchamianie runtime deweloperskiego

Plugin wstrzykuje mały runtime tylko podczas pracy serwera deweloperskiego. Zgłasza endpointowi PageFlow informacje o trasach, widoczne cele nawigacji, tytuły stron i gotowość.

## 3. Renderowanie prawdziwych stron

PageFlow otwiera strony aplikacji tego samego źródła w kontrolowanych iframe. Wybrana strona pozostaje aktywna, a strony w tle są przechwytywane do ograniczonej pamięci miniatur.

## 4. Wykrywanie nawigacji

Adaptery rozpoznają obsługiwane linki frameworka, kotwice tego samego źródła, zmiany historii, literalne cele programowe i jawne wskazówki nawigacji. Klient zamienia je w skierowane krawędzie grafu i aktywne obszary podglądu.

## 5. Układ grafu

LeaferJS renderuje planszę. Stosy tras upraszczają duże hierarchie ścieżek, indeks przestrzenny ogranicza pracę w viewport, a duże układy mogą działać w Workerze.

## Buildy produkcyjne

PageFlow służy wyłącznie do programowania. Jego endpointy runtime i klient wizualny nie są wstrzykiwane do wyniku produkcyjnego. Kontrola wyniku produkcyjnego w repozytorium sprawdza tę granicę.

## Granica bezpieczeństwa

Tryb podglądu blokuje nawigację kotwicami i wysyłanie formularzy w kontrolowanym frame, ale nie tłumi skutków ubocznych inicjalizacji aplikacji. Używaj danych lokalnych lub testowych.
