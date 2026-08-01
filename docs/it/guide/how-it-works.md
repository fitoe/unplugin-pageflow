# Come funziona PageFlow

PageFlow combina il rilevamento delle rotte specifico per framework con un client visivo indipendente dal framework.

## 1. Rilevare le rotte

L'adattatore selezionato legge la fonte delle rotte del framework. Vue Router e Nuxt espongono i record del router; i framework basati su file forniscono le rotte tramite le integrazioni di build; React Router accetta oggetti di rotta; Next.js usa un sidecar di sviluppo.

## 2. Avviare il runtime di sviluppo

Il plugin inserisce un piccolo runtime solo mentre il server di sviluppo è attivo. Segnala all'endpoint PageFlow informazioni sulle rotte, destinazioni di navigazione visibili, titoli delle pagine e stato di disponibilità.

## 3. Renderizzare pagine reali

PageFlow apre le pagine dell'applicazione della stessa origine in iframe controllati. La pagina selezionata resta attiva, mentre le pagine in background vengono acquisite in cache limitate di miniature.

## 4. Rilevare la navigazione

Gli adattatori riconoscono link supportati dal framework, ancore della stessa origine, modifiche alla cronologia, destinazioni programmatiche letterali e indicazioni esplicite di navigazione. Il client trasforma le destinazioni in archi direzionali del grafo e hotspot dell'anteprima.

## 5. Disporre il grafo

LeaferJS renderizza la tela. I mazzi di rotte riducono le grandi gerarchie di percorsi, un indice spaziale limita il lavoro nel viewport e i layout più grandi possono essere eseguiti in un Worker.

## Build di produzione

PageFlow è riservato allo sviluppo. I suoi endpoint runtime e il client visivo non vengono inseriti nell'output di produzione. Il controllo dell'output di produzione nel repository verifica questo confine.

## Confine di sicurezza

La modalità anteprima blocca la navigazione tramite ancore e l'invio dei moduli nel frame controllato, ma non può eliminare gli effetti collaterali dell'inizializzazione. Usa dati locali o di test.
