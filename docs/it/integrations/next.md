# Next.js

Next.js non espone un'interfaccia plugin Vite, quindi PageFlow usa un sidecar della stessa origine riservato allo sviluppo.

## Preparare PageFlow

Installa il pacchetto come dipendenza di sviluppo e assicurati che l'applicazione Next.js sia in esecuzione.

```bash
pnpm add -D unplugin-pageflow
pnpm next dev
```

## Avviare il sidecar

Esegui la CLI dalla radice dell'applicazione:

```bash
pageflow-next --dir . --host 127.0.0.1 --port 3000
```

La CLI rileva le rotte basate su file supportate di Next.js e mostra l'URL di PageFlow.

## Opzioni

- `--dir` seleziona il percorso del progetto Next.js.
- `--host` seleziona l'host di sviluppo.
- `--port` identifica la porta di sviluppo Next.js usata dal sidecar.

## Solo sviluppo

Il sidecar non fa parte di `next build` e non viene usato dal server di produzione. Mantienilo negli script di sviluppo locali, non nelle definizioni dei processi di produzione.

## Risoluzione dei problemi

- Avvia Next.js prima di aprire le anteprime delle pagine.
- Usa un host e una porta disponibili.
- Verifica che le pagine vengano renderizzate direttamente nella stessa sessione del browser.
- Usa autenticazione e dati locali o di test.
