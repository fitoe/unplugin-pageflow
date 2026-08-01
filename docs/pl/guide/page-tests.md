# Testy stron

PageFlow może przypisywać trasy do testów jednostkowych, komponentowych i end-to-end, a następnie uruchamiać jawnie skonfigurowane polecenia z wybranej strony.

## Automatyczne przypisanie

Test można przypisać, jeśli importuje komponent strony, stosuje konwencję tej samej nazwy lub przechodzi do pełnej trasy w przypadku testowym. PageFlow pokazuje powód każdego przypisania.

## Jawne mapowanie

Gdy automatyczne przypisanie jest niejednoznaczne, użyj globów tras i plików.

```ts
PageFlow.vite({
  pageTests: {
    '/orders/**': ['tests/orders-*.spec.ts'],
  },
})
```

## Polecenia testowe

Domyślnie żadne polecenie nie jest zgadywane ani włączane. Jawnie skonfiguruj każdy obsługiwany typ testu.

```ts
PageFlow.vite({
  testCommands: {
    unit: {
      command: 'pnpm',
      args: ['vitest', 'run', '{file}', '-t', '{name}'],
    },
    component: {
      command: 'pnpm',
      args: ['vitest', 'run', '{file}', '-t', '{name}'],
    },
    e2e: {
      command: 'pnpm',
      args: ['playwright', 'test', '{file}', '-g', '{name}'],
      timeoutMs: 180_000,
    },
  },
})
```

`{file}` i `{name}` są zastępowane zindeksowanymi wartościami. Polecenia działają z katalogu głównego projektu z `shell: false`. Domyślny limit wynosi 120 sekund; `timeoutMs` przyjmuje od 1 sekundy do 30 minut.

## Wyniki

Panel strony pokazuje stany: nieznany, uruchomiony, zaliczony, niezaliczony, pominięty lub anulowany. Działający test można anulować z PageFlow. Wynik testów pozostaje kwestią deweloperską i nigdy nie trafia do produkcyjnego bundle.
