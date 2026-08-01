# 시작하기

PageFlow는 애플리케이션 라우트와 탐색 경로를 보여 주는 개발 전용 시각적 지도입니다.

## 요구 사항

- Node.js 20.19 이상
- 지원되는 프레임워크 통합
- 초기화 중 쓰기 작업을 수행하는 페이지를 위한 로컬 또는 테스트 데이터

## 설치

```bash
pnpm add -D unplugin-pageflow
```

## Vite 설정

Vue Router를 사용하는 Vite 애플리케이션의 경우:

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

## PageFlow 열기

평소처럼 개발 서버를 시작합니다.

```bash
pnpm dev
```

터미널에 미리보기 URL이 표시됩니다.

```text
unplugin-pageflow  http://localhost:5173/__unplugin-pageflow/
```

이 URL을 열어 라우트 지도를 살펴보세요. 스크롤로 확대·축소하고, 캔버스를 드래그해 이동하며, 페이지를 선택해 관계를 확인할 수 있습니다.

## 다음 단계

- [다른 프레임워크 통합 선택하기](/ko/integrations/)
- [동적 라우트 매개변수 설정하기](/ko/reference/configuration#동적-라우트-매개변수)
- [미리보기 제한과 안전 확인하기](/ko/reference/limitations)
