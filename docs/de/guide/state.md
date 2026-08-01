# Seitenzustand

PageFlow bewahrt nützlichen Vorschauzustand, damit das Untersuchen einer anderen Seite die Oberfläche nicht immer zurücksetzt.

## Automatisch wiederhergestellter Zustand

Unterstützte native Eingabefelder, Auswahllisten, Kontrollkästchen und Scrollpositionen werden automatisch erfasst und wiederhergestellt. Passwort-, Datei- und Bestätigungscode-Felder sind bewusst ausgeschlossen.

## Anwendungszustand registrieren

Komplexe Widgets und Framework-Zustand können sich über `definePageFlowState` anmelden.

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

Einen stabilen, für den Zustandsblock eindeutigen Schlüssel verwenden. `get` sollte serialisierbare, nicht sensible Daten zurückgeben; `restore` muss nach dem Mounten der Seite sicher aufrufbar sein.

## Isolation

Zustand und zwischengespeicherte Vorschauen werden anhand der vollständigen Seiten-URL einschließlich relevanter Query-Strings und Hashes sowie der für die Vorschau verwendeten PageFlow-Rolle isoliert.

## Sicherheit

Niemals Passwörter, Tokens, Bestätigungscodes, private Schlüssel oder Kundengeheimnisse registrieren. Registrierten Zustand als Daten eines Entwicklungswerkzeugs behandeln, nicht als sicheren Speicher.
