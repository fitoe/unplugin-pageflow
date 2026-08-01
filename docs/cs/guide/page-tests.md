# Testy stránek

PageFlow dokáže přiřadit trasy k jednotkovým, komponentovým a end-to-end testům a z vybrané stránky spustit explicitně nastavené příkazy.

## Automatické přiřazení

Test lze přiřadit, pokud importuje komponentu stránky, dodržuje konvenci stejného názvu nebo v testovacím scénáři přejde na celou trasu. PageFlow ukazuje důvod každého přiřazení.

## Explicitní mapování

Pokud je automatické přiřazení nejednoznačné, použijte globy tras a souborů.

```ts
PageFlow.vite({
  pageTests: {
    '/orders/**': ['tests/orders-*.spec.ts'],
  },
})
```

## Testovací příkazy

Ve výchozím stavu se žádný příkaz neodhaduje ani nepovoluje. Každý podporovaný typ testu nastavte explicitně.

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

`{file}` a `{name}` se nahrazují indexovanými hodnotami. Příkazy běží z kořene projektu s `shell: false`. Výchozí časový limit je 120 sekund; `timeoutMs` přijímá 1 sekundu až 30 minut.

## Výsledky

Panel stránky hlásí stavy neznámý, probíhá, úspěšný, neúspěšný, přeskočený nebo zrušený. Běžící test lze z PageFlow zrušit. Výstup testu zůstává vývojovou záležitostí a nikdy není součástí produkčního bundle.
