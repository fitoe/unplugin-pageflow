# Domande frequenti

## PageFlow viene eseguito in produzione?

No. PageFlow è uno strumento di sviluppo. Il runtime e gli endpoint sono esclusi dalle build di produzione.

## Sostituisce un router o un test runner?

No. Legge le rotte dalle integrazioni supportate ed esegue soltanto i comandi di test configurati esplicitamente.

## Può aggirare l'autenticazione?

No. Le anteprime usano la sessione corrente del browser e la normale autorizzazione dell'applicazione.

## PageFlow fa clic automaticamente su ogni controllo?

No. Rileva le destinazioni di navigazione supportate, ma non esplora il prodotto facendo clic automaticamente sui controlli.

## Perché manca una destinazione calcolata?

Una destinazione composta durante l'esecuzione potrebbe non esistere prima dell'interazione pertinente. Preferisci un collegamento supportato o fornisci un'indicazione esplicita quando l'adattatore lo consente.

## Le anteprime possono modificare i dati?

Il codice di inizializzazione continua a essere eseguito. La modalità anteprima blocca la navigazione tramite ancore e l'invio dei moduli nel frame controllato, ma non può impedire gli effetti collaterali dell'inizializzazione. Usa dati locali o di test.

## Dove vengono archiviate le miniature?

Le miniature persistenti sono archiviate in `.unplugin-pageflow/cache`. Puoi eliminare il percorso in sicurezza quando il server di sviluppo è fermo.

## Quali framework sono supportati?

Consulta la [matrice di compatibilità](/it/reference/compatibility) corrente.

## Come segnalo un bug?

Apri una issue su [GitHub](https://github.com/fitoe/unplugin-pageflow/issues) indicando framework, versioni, configurazione minima, modello di rotta e output pertinente della console.
