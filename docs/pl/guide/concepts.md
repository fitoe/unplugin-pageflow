# Podstawowe pojęcia

PageFlow zmienia trasy i cele nawigacji aplikacji w graf, który można przeglądać. Zrozumienie pięciu pojęć upraszcza korzystanie z całego interfejsu.

## Strony

Strona reprezentuje jedną konkretną trasę, którą PageFlow może wyrenderować. Trasy statyczne są gotowe natychmiast. Trasy dynamiczne stają się dostępne po podaniu reprezentatywnych wartości parametrów.

Każda strona może mieć tytuł, ścieżkę trasy, podgląd, miniaturę, linki nawigacyjne i przypisane testy. Ciągi zapytania i hashe mogą zachować dokładniejsze miejsce nawigacji bez tworzenia oddzielnych definicji tras.

## Linki nawigacyjne

Link to skierowana relacja między stronami. PageFlow wykrywa obsługiwane linki routera, kotwice tego samego źródła, literalne cele programowe, nawigację historią przeglądarki i jawne wskazówki frameworka, takie jak `data-pageflow-to`.

Cele obliczane mogą zostać poznane dopiero po wykonaniu przez aplikację odpowiedniej interakcji.

## Aktywne obszary

Po wybraniu strony PageFlow wyróżnia elementy prowadzące do znanej nawigacji. Aktywne obszary łączą wizualny podgląd z grafem: pokazują nie tylko relację dwóch tras, lecz także miejsce rozpoczęcia przejścia w prawdziwym interfejsie.

## Podglądy i miniatury

Wybrana strona używa aktywnego iframe tego samego źródła. Inne pobliskie strony używają zapisanych podglądów, aby plansza pozostała płynna. Miniatury z pamięci podręcznej są widoczne podczas odświeżania nieaktualnych stron w tle.

## Grupy tras

Duże drzewa tras są zwijane w stosy. Otwórz stos, aby zobaczyć elementy podrzędne, a następnie użyj nawigacji okruszkowej, aby wrócić do przodka. Grupowanie zmniejsza wizualny szum bez utraty relacji między stronami.

## Dalej

- [Poznaj sterowanie planszą](/pl/guide/canvas)
- [Skonfiguruj trasy dynamiczne](/pl/guide/dynamic-routes)
- [Zobacz, jak działa PageFlow](/pl/guide/how-it-works)
