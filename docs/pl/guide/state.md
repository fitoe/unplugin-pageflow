# Stan strony

PageFlow zachowuje użyteczny stan podglądu, dzięki czemu przejście do innej strony nie zawsze resetuje interfejs.

## Stan przywracany automatycznie

Obsługiwane natywne pola, listy, checkboxy i pozycje przewijania są automatycznie przechwytywane i przywracane. Pola haseł, plików i kodów weryfikacyjnych są celowo wykluczone.

## Rejestracja stanu aplikacji

Złożone widżety i stan frameworka mogą uczestniczyć przez `definePageFlowState`.

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

Użyj stabilnego klucza unikalnego dla bloku stanu. Z `get` zwracaj serializowalne, niewrażliwe dane i zapewnij bezpieczne wywołanie `restore` po zamontowaniu strony.

## Izolacja

Stan i podglądy w pamięci są oddzielane według pełnego URL strony, w tym istotnych ciągów zapytania i hashy, oraz roli PageFlow używanej do podglądu.

## Bezpieczeństwo

Nigdy nie rejestruj haseł, tokenów, kodów weryfikacyjnych, kluczy prywatnych ani tajnych danych klientów. Traktuj zarejestrowany stan jako dane narzędzia deweloperskiego, nie jako bezpieczne przechowywanie.
