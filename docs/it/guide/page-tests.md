# Test delle pagine

PageFlow può associare le rotte a test unitari, di componente ed end-to-end, quindi eseguire dalla pagina selezionata i comandi configurati esplicitamente.

## Associazione automatica

Un test può essere associato se importa un componente di pagina, segue una convenzione di nomi uguali o naviga verso la rotta completa in un caso di test. PageFlow mostra il motivo di ogni associazione.

## Mappature esplicite

Usa glob di rotte e file quando l'associazione automatica è ambigua.

```ts
PageFlow.vite({
  pageTests: {
    '/orders/**': ['tests/orders-*.spec.ts'],
  },
})
```

## Comandi di test

Nessun comando viene dedotto o abilitato per impostazione predefinita. Configura esplicitamente ogni tipo di test supportato.

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

`{file}` e `{name}` vengono sostituiti con i valori indicizzati. I comandi sono eseguiti dalla radice del progetto con `shell: false`. Il timeout predefinito è di 120 secondi; `timeoutMs` accetta valori da 1 secondo a 30 minuti.

## Risultati

Il pannello della pagina segnala gli stati sconosciuto, in esecuzione, superato, non superato, ignorato o annullato. Un test in esecuzione può essere annullato da PageFlow. L'output dei test riguarda solo lo sviluppo e non viene mai incluso nel bundle di produzione.
