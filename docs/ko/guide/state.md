# 페이지 상태

PageFlow는 유용한 미리보기 상태를 보존하여 다른 페이지를 살펴볼 때마다 UI가 초기화되지 않게 합니다.

## 자동 복원 상태

지원되는 네이티브 입력, select, checkbox와 스크롤 위치는 자동으로 캡처하고 복원합니다. 비밀번호, 파일, 인증 코드 필드는 의도적으로 제외합니다.

## 애플리케이션 상태 등록

복잡한 위젯과 프레임워크 상태는 `definePageFlowState`로 참여할 수 있습니다.

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

상태 블록마다 고유하고 안정적인 키를 사용하세요. `get`에서는 직렬화할 수 있는 민감하지 않은 데이터를 반환하고, 페이지가 마운트된 뒤 `restore`를 안전하게 호출할 수 있어야 합니다.

## 격리

상태와 캐시된 미리보기는 의미 있는 쿼리 문자열과 해시를 포함한 전체 페이지 URL 및 미리보기에 사용된 PageFlow 역할에 따라 격리됩니다.

## 보안

비밀번호, 토큰, 인증 코드, 개인 키 또는 고객 비밀을 등록하지 마세요. 등록 상태는 안전한 저장소가 아니라 개발 도구 데이터로 취급해야 합니다.
