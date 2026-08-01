# Usare la tela

La tela di PageFlow è progettata per esplorare un grafo di rotte, non per modificare i dati dell'applicazione.

## Spostamento e zoom

- Scorri o usa il trackpad per ingrandire intorno al puntatore.
- Trascina uno spazio vuoto della tela per spostare l'area visibile.
- Seleziona una scheda di pagina per metterla a fuoco e mostrarne le relazioni.
- Usa i controlli del viewport per confrontare anteprime mobili e desktop.

## Mettere a fuoco una pagina

Selezionare una pagina porta in vista le pagine collegate, trasforma l'anteprima selezionata in un iframe attivo e mostra gli hotspot di navigazione. La vista focalizzata è utile quando il grafo completo contiene più contesto del necessario.

## Esplorare i gruppi di rotte

Le rotte con segmenti di percorso condivisi possono apparire come un mazzo. Aprilo per esaminare il livello successivo. PageFlow mantiene un percorso per il gruppo attivo e anima il passaggio tra i livelli per rendere chiaro il contesto corrente.

## Leggere le connessioni

Le connessioni sono direzionali. Una linea in uscita indica che la pagina di origine contiene un modo noto per raggiungere la destinazione. L'assenza di una linea non significa sempre che la navigazione sia impossibile: le destinazioni calcolate vengono rilevate solo quando l'applicazione le espone.

## Aggiornare le anteprime

PageFlow acquisisce le pagine obsolete in una coda limitata. La pagina selezionata e quelle visibili hanno priorità. Le modifiche a rotte e collegamenti arrivano tramite HMR, mentre le miniature esistenti restano visibili fino alla disponibilità delle nuove.

## Suggerimenti

- Inizia dalla home page o dalla rotta di ingresso principale.
- Nei progetti grandi, entra in un gruppo di rotte alla volta.
- Usa dati di test prima di focalizzare pagine che scrivono dati durante l'inizializzazione.
- Se una pagina non diventa mai pronta, aggiungi un [segnale esplicito di disponibilità](/it/reference/configuration#disponibilità-dellanteprima).
