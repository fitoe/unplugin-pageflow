# Często zadawane pytania

## Czy PageFlow działa w produkcji?

Nie. PageFlow jest narzędziem deweloperskim. Jego runtime i endpointy są wykluczane z buildów produkcyjnych.

## Czy zastępuje router lub narzędzie do testów?

Nie. Odczytuje trasy z obsługiwanych integracji i uruchamia wyłącznie jawnie skonfigurowane polecenia testowe.

## Czy może ominąć uwierzytelnianie?

Nie. Podglądy korzystają z bieżącej sesji przeglądarki i zwykłej autoryzacji aplikacji.

## Czy PageFlow automatycznie klika wszystkie kontrolki?

Nie. Wykrywa obsługiwane cele nawigacji, ale nie przeszukuje produktu przez automatyczne klikanie kontrolek.

## Dlaczego brakuje obliczanego celu?

Cel składany w czasie działania może nie istnieć przed odpowiednią interakcją. Użyj obsługiwanego linku lub jawnej wskazówki, jeśli adapter frameworka na to pozwala.

## Czy podglądy mogą zmieniać dane?

Kod inicjalizacji aplikacji nadal się wykonuje. Tryb podglądu blokuje nawigację kotwicami i wysyłanie formularzy w kontrolowanym frame, ale nie może zapobiec skutkom ubocznym inicjalizacji. Używaj danych lokalnych lub testowych.

## Gdzie są przechowywane miniatury?

Trwałe miniatury znajdują się w `.unplugin-pageflow/cache`. Katalog można bezpiecznie usunąć po zatrzymaniu serwera deweloperskiego.

## Które frameworki są obsługiwane?

Zobacz aktualną [macierz zgodności](/pl/reference/compatibility).

## Jak zgłosić błąd?

Otwórz issue na [GitHubie](https://github.com/fitoe/unplugin-pageflow/issues), podając framework, wersje, minimalną konfigurację, wzorzec trasy i odpowiedni wynik konsoli.
