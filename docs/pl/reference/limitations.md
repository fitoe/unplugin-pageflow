# Ograniczenia i bezpieczeństwo

PageFlow renderuje prawdziwe strony aplikacji podczas programowania. Traktuj podglądy jak zwykłe odwiedziny lokalnej aplikacji.

## Co robi PageFlow

- Wykrywa trasy udostępnione przez wybrany adapter frameworka.
- Renderuje podglądy stron tego samego źródła.
- Wykrywa obsługiwane linki i cele nawigacji.
- Blokuje nawigację kotwicami i wysyłanie formularzy w trybie podglądu.
- Nie umieszcza runtime w buildach produkcyjnych.

## Czego PageFlow nie robi

- Nie obchodzi uwierzytelniania ani autoryzacji.
- Nie klika automatycznie kontrolek.
- Nie tłumi skutków ubocznych uruchamiania aplikacji.
- Nie potrafi wywnioskować każdego obliczanego celu przed odpowiednią interakcją.
- Nie sprawdza wnętrza framework islands w Astro.

## Używaj bezpiecznych danych

Dla stron zapisujących dane podczas inicjalizacji używaj danych lokalnych lub testowych. Nie konfiguruj prawdziwych haseł, tokenów, kodów weryfikacyjnych ani innych sekretów jako stanu podglądu.

Uwierzytelnianie i stan właściwy dla trasy pochodzą z bieżącej sesji przeglądarki. Strona bez uprawnień może wyświetlić zwykły ekran logowania lub odmowy dostępu.
