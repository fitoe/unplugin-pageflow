# Stav stránky

PageFlow uchovává užitečný stav náhledu, takže prohlížení jiné stránky nemusí vždy resetovat rozhraní.

## Automaticky obnovený stav

Podporované nativní vstupy, selecty, checkboxy a pozice posunu se automaticky zachytávají a obnovují. Pole hesel, souborů a ověřovacích kódů jsou záměrně vyloučena.

## Registrace stavu aplikace

Složité widgety a stav frameworku se mohou zapojit pomocí `definePageFlowState`.

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

Použijte stabilní klíč jedinečný pro blok stavu. Z `get` vracejte serializovatelná necitlivá data a zajistěte, aby bylo `restore` bezpečné volat po připojení stránky.

## Izolace

Stav a náhledy v cache jsou oddělené podle celé URL stránky včetně významných řetězců dotazu a hashů a podle role PageFlow použité pro náhled.

## Bezpečnost

Nikdy neregistrujte hesla, tokeny, ověřovací kódy, soukromé klíče ani tajné údaje zákazníků. Registrovaný stav považujte za data vývojového nástroje, ne za bezpečné úložiště.
