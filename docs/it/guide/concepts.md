# Concetti fondamentali

PageFlow trasforma le rotte e le destinazioni di navigazione di un'applicazione in un grafo esplorabile. Cinque concetti rendono semplice il resto dell'interfaccia.

## Pagine

Una pagina rappresenta una rotta concreta che PageFlow può renderizzare. Le rotte statiche sono subito disponibili. Le rotte dinamiche diventano renderizzabili dopo aver fornito valori rappresentativi per i parametri.

Ogni pagina può avere titolo, percorso, anteprima, miniatura, collegamenti di navigazione e test associati. Stringhe di query e hash possono conservare una posizione di navigazione più specifica senza creare definizioni di rotta indipendenti.

## Collegamenti di navigazione

Un collegamento è una relazione direzionale da una pagina a un'altra. PageFlow può rilevare link supportati dal router, ancore della stessa origine, destinazioni programmatiche letterali, navigazione nella cronologia del browser e indicazioni esplicite del framework come `data-pageflow-to`.

Le destinazioni calcolate potrebbero essere note solo dopo che l'applicazione ha eseguito l'interazione corrispondente.

## Hotspot

Quando selezioni una pagina, PageFlow evidenzia gli elementi che producono una navigazione nota. Gli hotspot collegano l'anteprima visiva al grafo: mostrano non solo la relazione tra due rotte, ma anche dove inizia la transizione nell'interfaccia reale.

## Anteprime e miniature

La pagina selezionata usa un iframe attivo della stessa origine. Le altre pagine vicine usano anteprime acquisite per mantenere reattiva la tela. Le miniature in cache restano visibili mentre le pagine obsolete vengono aggiornate in background.

## Gruppi di rotte

Gli alberi di rotte più grandi vengono raccolti in mazzi. Apri un mazzo per esaminarne i figli e usa il percorso di navigazione per tornare a un livello precedente. Il raggruppamento riduce il rumore visivo senza perdere le relazioni tra le pagine.

## Continua

- [Impara i controlli della tela](/it/guide/canvas)
- [Configura le rotte dinamiche](/it/guide/dynamic-routes)
- [Scopri come funziona PageFlow](/it/guide/how-it-works)
