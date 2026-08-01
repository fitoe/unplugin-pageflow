# Trasy dynamiczne

Trasy takiej jak `/products/:id` nie można wyrenderować, dopóki PageFlow nie zna bezpiecznej wartości `id`. Skonfiguruj reprezentatywne wartości przez `dynamicParams`.

```ts
PageFlow.vite({
  dynamicParams: {
    '/products/:id': { id: 'demo-product' },
    '/users/:userId/orders/:orderId': {
      userId: 'alice',
      orderId: 'order-100',
    },
  },
})
```

## Dopasowanie

Użyj wzorca trasy udostępnionego przez adapter frameworka jako klucza obiektu. Każdy nazwany parametr wymagany przez wzorzec musi mieć wartość.

## Ciągi zapytania i hashe

PageFlow zachowuje znalezione ciągi zapytania i hashe jako miejsca nawigacji. Mogą reprezentować karty, filtry lub kotwice, podczas gdy bazowa trasa pozostaje taka sama.

```text
/products/demo-product?tab=history#activity
```

## Wybór przykładowych wartości

Używaj stabilnych identyfikatorów opartych na lokalnych fixture lub danych testowych. Unikaj rzeczywistych identyfikatorów klientów i stron, które mogą wykonać nieodwracalny zapis podczas inicjalizacji.

Parametry dynamiczne jedynie budują URL. Nie obchodzą uwierzytelniania, autoryzacji, loaderów ani walidacji aplikacji.

## Rozwiązywanie problemów

Jeśli strona dynamiczna nadal się nie renderuje:

1. Sprawdź, czy skonfigurowany klucz dokładnie odpowiada wzorcowi trasy frameworka.
2. Podaj wszystkie wymagane parametry.
3. Otwórz wygenerowany URL bezpośrednio w tej samej sesji przeglądarki.
4. Sprawdź, czy uwierzytelnianie lub loader nie przekierowuje żądania.
