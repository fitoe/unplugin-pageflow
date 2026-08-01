# Limitazioni e sicurezza

PageFlow renderizza pagine reali dell'applicazione durante lo sviluppo. Tratta le anteprime come normali visite all'applicazione locale.

## Cosa fa PageFlow

- Rileva le rotte esposte dall'adattatore del framework selezionato.
- Renderizza anteprime di pagine della stessa origine.
- Rileva collegamenti e destinazioni di navigazione supportati.
- Blocca la navigazione tramite ancore e l'invio dei moduli in modalità anteprima.
- Mantiene il runtime fuori dalle build di produzione.

## Cosa non fa PageFlow

- Non aggira autenticazione o autorizzazione.
- Non fa clic automaticamente sui controlli.
- Non elimina gli effetti collaterali all'avvio dell'applicazione.
- Non può dedurre ogni destinazione calcolata prima dell'interazione pertinente.
- Non ispeziona gli elementi interni degli island dei framework in Astro.

## Usa dati sicuri

Usa dati locali o di test per le pagine che effettuano scritture durante l'inizializzazione. Non configurare password, token, codici di verifica o altri segreti reali come stato dell'anteprima.

L'autenticazione e lo stato specifico della rotta provengono dalla sessione corrente del browser. Una pagina senza autorizzazione può mostrare la normale schermata di accesso o accesso negato.
