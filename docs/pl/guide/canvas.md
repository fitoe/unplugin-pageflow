# Korzystanie z planszy

Plansza PageFlow służy do przeglądania grafu tras, a nie do edycji danych aplikacji.

## Ruch i powiększenie

- Przewijaj lub używaj gładzika, aby powiększać wokół wskaźnika.
- Przeciągaj pustą przestrzeń planszy, aby przesuwać viewport.
- Wybierz kartę strony, aby ją wyróżnić i zobaczyć relacje.
- Użyj kontrolek viewportu, aby porównać podglądy mobilne i desktopowe.

## Skupienie na stronie

Wybranie strony sprowadza połączone strony do widoku, zmienia wybrany podgląd w aktywny iframe i pokazuje aktywne obszary nawigacji. Widok skupiony jest przydatny, gdy pełny graf zawiera więcej kontekstu, niż potrzebujesz.

## Przeglądanie grup tras

Trasy ze wspólnymi segmentami ścieżki mogą pojawiać się jako stos. Otwórz go, aby zobaczyć kolejny poziom. PageFlow zachowuje nawigację okruszkową aktywnej grupy i animuje przejścia, by bieżący kontekst pozostał jasny.

## Odczytywanie połączeń

Połączenia są skierowane. Linia wychodząca oznacza, że strona źródłowa zawiera znany sposób dotarcia do celu. Brak linii nie zawsze oznacza brak nawigacji: cele obliczane są wykrywane dopiero po ujawnieniu przez aplikację.

## Odświeżanie podglądów

PageFlow zapisuje nieaktualne strony w ograniczonej kolejce. Wybrana i widoczne strony mają pierwszeństwo. Zmiany tras i linków są dostarczane przez HMR, a dotychczasowe miniatury pozostają do czasu przygotowania nowych.

## Wskazówki

- Zacznij od strony głównej lub głównej trasy wejściowej.
- W dużych aplikacjach otwieraj jedną grupę tras naraz.
- Użyj danych testowych przed skupieniem stron zapisujących dane przy inicjalizacji.
- Jeśli strona nigdy nie jest gotowa, dodaj [jawny sygnał gotowości](/pl/reference/configuration#gotowość-podglądu).
