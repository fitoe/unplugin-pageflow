# Page state

PageFlow preserves useful preview state so inspecting another page does not always reset the UI.

## Automatically restored state

Supported native inputs, selects, checkboxes, and scroll positions are captured and restored automatically. Password, file, and verification-code fields are intentionally excluded.

## Register application state

Complex widgets and framework state can opt in through `definePageFlowState`.

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

Use a stable key unique to the state block. Return serializable, non-sensitive data from `get`, and make `restore` safe to call after the page mounts.

## Isolation

State and cached previews are isolated by the complete page URL, including meaningful query strings and hashes, and by the PageFlow role used for the preview.

## Security

Never register passwords, tokens, verification codes, private keys, or customer secrets. Treat registered state as development tooling data, not as a secure storage mechanism.

