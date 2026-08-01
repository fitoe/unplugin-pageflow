# Risoluzione dei problemi

## Non appare alcuna rotta

- Verifica di aver installato l'adattatore corrispondente al router dell'applicazione.
- Controlla che PageFlow sia in esecuzione nel server di sviluppo, non in un'anteprima di produzione.
- Nelle configurazioni Vite semplici senza un router ispezionabile, fornisci rotte esplicite se l'integrazione lo supporta.

## Una pagina dinamica non si apre

Aggiungi valori di esempio sicuri a `dynamicParams`. Verifica il modello di rotta e apri direttamente l'URL generato per individuare reindirizzamenti dell'autenticazione o del loader.

## Un'anteprima resta vuota o in caricamento

- Controlla la console dell'applicazione e le richieste di rete.
- Verifica che la pagina possa essere renderizzata nella sessione corrente del browser.
- Attendi il caricamento dei font e delle immagini necessarie.
- Per attività asincrone lunghe, chiama `window.__UNPLUGIN_PAGEFLOW_READY__?.()` quando la pagina è pronta.

## La navigazione è assente

PageFlow rileva collegamenti supportati e destinazioni letterali. Le destinazioni programmatiche calcolate possono comparire solo dopo l'interazione. Gli elementi interni degli island Astro non vengono ispezionati intenzionalmente; usa un'ancora della stessa origine o `data-pageflow-to` quando necessario.

## Le miniature sono obsolete

Lascia che la coda di acquisizione aggiorni le pagine visibili. Se la cache non è più utile, arresta il server di sviluppo e rimuovi `.unplugin-pageflow/cache`.

## Appaiono pagine di autenticazione

L'autenticazione proviene dalla sessione corrente del browser. Accedi all'applicazione locale nella stessa sessione oppure considera la normale pagina di accesso o accesso negato come anteprima corretta.

## I test non vengono associati

Controlla le regole di associazione automatica, quindi aggiungi una mappatura esplicita `pageTests`. Un test può essere eseguito solo se il suo tipo ha una voce configurata in `testCommands`.

## Il sidecar Next.js non funziona

Verifica che l'applicazione sia in esecuzione, che host e porta del sidecar siano disponibili e che entrambe le interfacce usino la configurazione attesa della stessa origine. Consulta la [guida Next.js](/it/integrations/next).
