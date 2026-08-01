# Rozwiązywanie problemów

## Nie pojawiają się żadne trasy

- Sprawdź, czy zainstalowano adapter odpowiadający routerowi aplikacji.
- Upewnij się, że PageFlow działa na serwerze deweloperskim, a nie w podglądzie produkcyjnym.
- W prostym Vite bez dostępnego routera podaj jawne trasy, jeśli integracja to obsługuje.

## Strona dynamiczna się nie otwiera

Dodaj bezpieczne przykładowe wartości do `dynamicParams`. Sprawdź wzorzec trasy i otwórz wygenerowany URL bezpośrednio, aby zobaczyć przekierowania uwierzytelniania lub loadera.

## Podgląd pozostaje pusty lub się ładuje

- Sprawdź konsolę aplikacji i żądania sieciowe.
- Upewnij się, że strona renderuje się w bieżącej sesji przeglądarki.
- Poczekaj na wymagane fonty i obrazy.
- Dla długiej pracy asynchronicznej wywołaj `window.__UNPLUGIN_PAGEFLOW_READY__?.()` po przygotowaniu strony.

## Brakuje nawigacji

PageFlow wykrywa obsługiwane linki i literalne cele. Obliczane cele programowe mogą pojawić się dopiero po interakcji. Wnętrze Astro islands celowo nie jest sprawdzane; w razie potrzeby użyj kotwicy tego samego źródła lub `data-pageflow-to`.

## Miniatury są nieaktualne

Pozwól kolejce przechwytywania odświeżyć widoczne strony. Jeśli pamięć nie jest już potrzebna, zatrzymaj serwer deweloperski i usuń `.unplugin-pageflow/cache`.

## Pojawiają się strony uwierzytelniania

Uwierzytelnianie pochodzi z bieżącej sesji przeglądarki. Zaloguj się do lokalnej aplikacji w tej samej sesji lub uznaj oczekiwaną stronę logowania/odmowy dostępu za prawidłowy podgląd.

## Testy nie są przypisywane

Sprawdź reguły automatycznego przypisywania i dodaj jawne mapowanie `pageTests`. Test może się uruchomić tylko wtedy, gdy jego typ ma skonfigurowany wpis `testCommands`.

## Sidecar Next.js nie działa

Sprawdź, czy aplikacja działa, host i port sidecara są dostępne, a obie powierzchnie używają oczekiwanej konfiguracji tego samego źródła. Zobacz [przewodnik Next.js](/pl/integrations/next).
