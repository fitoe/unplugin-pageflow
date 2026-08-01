# Stato della pagina

PageFlow conserva lo stato utile dell'anteprima, così l'esame di un'altra pagina non azzera sempre l'interfaccia.

## Stato ripristinato automaticamente

Input nativi supportati, select, checkbox e posizioni di scorrimento vengono acquisiti e ripristinati automaticamente. I campi password, file e codice di verifica sono esclusi intenzionalmente.

## Registrare lo stato dell'applicazione

Widget complessi e stato del framework possono partecipare tramite `definePageFlowState`.

```ts
import { onUnmounted, ref } from 'vue'
import { definePageFlowState } from 'unplugin-pageflow/runtime-state'

const activeTab = ref('overview')
const selectedRole = ref('farmer')

const stop = definePageFlowState('page-options', {
  get: () => ({
    activeTab: activeTab.value,
    selectedRole: selectedRole.value,
  }),
  restore: (state) => {
    activeTab.value = state.activeTab
    selectedRole.value = state.selectedRole
  },
})

onUnmounted(stop)
```

Usa una chiave stabile e univoca per il blocco di stato. Restituisci da `get` dati serializzabili e non sensibili e rendi `restore` sicuro da chiamare dopo il montaggio della pagina.

## Isolamento

Lo stato e le anteprime in cache sono isolati dall'URL completo della pagina, comprese stringhe di query e hash significativi, e dal ruolo PageFlow usato per l'anteprima.

## Sicurezza

Non registrare mai password, token, codici di verifica, chiavi private o segreti dei clienti. Considera lo stato registrato come dati di uno strumento di sviluppo, non come archiviazione sicura.
