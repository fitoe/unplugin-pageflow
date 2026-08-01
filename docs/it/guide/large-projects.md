# Progetti grandi e cache

PageFlow evita di renderizzare ogni rotta come documento attivo nello stesso momento. La strategia di rendering e cache è limitata per mantenere esplorabili i grafi più grandi.

## Rendering del viewport

Vengono montate solo le anteprime DOM vicine e gli oggetti scena LeaferJS. Le pagine lontane usano rappresentazioni compatte. Una pagina selezionata viene promossa a iframe attivo.

## Livelli delle miniature

Le pagine vicine possono usare anteprime dettagliate. Quelle lontane usano miniature WebP compatte, mentre le pagine lunghe possono essere divise in riquadri montati nel viewport. Le miniature obsolete restano visibili mentre vengono acquisite quelle nuove.

## Coda di acquisizione

Prima di acquisire una pagina, PageFlow attende font, immagini e un DOM stabile. Il lavoro procede una pagina alla volta, dando priorità alla pagina selezionata e a quelle visibili.

## Layout e ricerca

I grafi oltre 1.000 pagine possono spostare il layout in un Worker. Un indice spaziale trova le pagine visibili senza scansionare l'intero grafo a ogni aggiornamento del viewport.

## Posizione della cache

Le miniature persistenti sono archiviate in:

```text
.unplugin-pageflow/cache
```

Le cache in memoria e su disco usano budget LRU fissi. Il percorso è un output di sviluppo eliminabile e può essere rimosso quando serve un'acquisizione completamente nuova.

## Indicazioni pratiche

- Raggruppa le rotte con segmenti di percorso significativi.
- Fornisci esempi stabili per i parametri dinamici.
- Rendi deterministiche le pagine di anteprima usando dati fixture.
- Usa il segnale di disponibilità per pagine asincrone di lunga durata.
