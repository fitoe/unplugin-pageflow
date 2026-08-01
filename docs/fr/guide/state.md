# État des pages

PageFlow conserve l’état utile des aperçus afin que l’inspection d’une autre page ne réinitialise pas toujours l’interface.

## État restauré automatiquement

Les champs natifs pris en charge, listes, cases à cocher et positions de défilement sont capturés et restaurés. Les mots de passe, fichiers et codes de vérification sont exclus.

## Enregistrer l’état de l’application

Les widgets complexes et états du framework peuvent utiliser `definePageFlowState`.

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

Utilisez une clé stable et unique. `get` doit retourner des données sérialisables et non sensibles ; `restore` doit pouvoir être appelé sans risque après le montage.

## Isolation

L’état et les aperçus sont isolés par URL complète, y compris les requêtes et fragments significatifs, ainsi que par rôle PageFlow.

## Sécurité

N’enregistrez jamais de mots de passe, jetons, codes, clés privées ou secrets clients. Cet état est une donnée d’outil de développement, pas un stockage sécurisé.
