# Rotte dinamiche

Una rotta come `/products/:id` non può essere renderizzata finché PageFlow non conosce un valore sicuro per `id`. Configura valori rappresentativi con `dynamicParams`.

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

## Corrispondenza

Usa come chiave dell'oggetto il modello di rotta esposto dall'adattatore del framework. Ogni parametro denominato richiesto dal modello deve avere un valore.

## Stringhe di query e hash

PageFlow conserva le stringhe di query e gli hash rilevati come posizioni di navigazione. Possono rappresentare schede, filtri o ancore mentre la rotta sottostante rimane la stessa.

```text
/products/demo-product?tab=history#activity
```

## Scegliere valori di esempio

Usa identificatori stabili basati su fixture locali o dati di test. Evita ID di clienti reali e pagine che possono eseguire scritture irreversibili durante l'inizializzazione.

I parametri dinamici costruiscono solo un URL. Non aggirano autenticazione, autorizzazione, loader o validazione dell'applicazione.

## Risoluzione dei problemi

Se una pagina dinamica non viene ancora renderizzata:

1. Verifica che la chiave configurata corrisponda esattamente al modello di rotta del framework.
2. Fornisci tutti i parametri richiesti.
3. Apri direttamente l'URL generato nella stessa sessione del browser.
4. Controlla se l'autenticazione o un loader reindirizza la richiesta.
