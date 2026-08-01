# Vite + Vue Router

Vite 어댑터는 Vue Router 애플리케이션에 가장 직접적인 PageFlow 통합을 제공합니다.

## 설치

```bash
pnpm add -D unplugin-pageflow
```

## 설정

```ts
// vite.config.ts
import vue from '@vitejs/plugin-vue'
import PageFlow from 'unplugin-pageflow'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    vue(),
    PageFlow.vite(),
  ],
})
```

평소처럼 Vite를 시작하고 터미널에 표시된 PageFlow URL을 여세요.

## 라우트 탐색

개발 런타임은 `router.getRoutes()`를 읽습니다. Vue Router 링크와 리터럴 `router.push()` 또는 `router.replace()` 대상을 인식하고 라우트와 링크 변경을 Vite HMR로 갱신합니다.

## 동적 라우트

```ts
PageFlow.vite({
  dynamicParams: {
    '/products/:id': { id: 'demo-product' },
  },
})
```

## 페이지 상태

네이티브 컨트롤과 스크롤 위치는 자동 복원할 수 있습니다. 애플리케이션별 Vue 상태에는 [`definePageFlowState`](/ko/guide/state)를 사용하세요.

## 제한 사항

- 계산된 대상은 애플리케이션이 노출한 뒤에만 사용할 수 있습니다.
- 인증은 현재 브라우저 세션에서 가져옵니다.
- 초기화 부작용은 미리보기에서도 실행됩니다.
