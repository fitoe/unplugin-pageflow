# Estado da página

O PageFlow preserva estados úteis da prévia para que a inspeção de outra página nem sempre redefina a interface.

## Estado restaurado automaticamente

Campos nativos compatíveis, seletores, caixas de seleção e posições de rolagem são capturados e restaurados automaticamente. Campos de senha, arquivo e código de verificação são excluídos intencionalmente.

## Registrar o estado da aplicação

Widgets complexos e estados do framework podem participar por meio de `definePageFlowState`.

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

Use uma chave estável e exclusiva para o bloco de estado. Retorne dados serializáveis e não sensíveis em `get`, e faça com que `restore` possa ser chamado com segurança depois que a página for montada.

## Isolamento

O estado e as prévias em cache são isolados pela URL completa da página, incluindo strings de consulta e hashes relevantes, e pelo papel do PageFlow usado na prévia.

## Segurança

Nunca registre senhas, tokens, códigos de verificação, chaves privadas ou segredos de clientes. Trate o estado registrado como dados de uma ferramenta de desenvolvimento, não como armazenamento seguro.
