# 호환성

PageFlow에는 Node.js 20.19 이상이 필요합니다. 개발 의존성으로 설치하세요.

| 통합 | 최소 peer 버전 | 라우트 소스 | 참고 |
| --- | --- | --- | --- |
| Vite + Vue Router | Vite 5, Vue 3.4, Vue Router 4 | `router.getRoutes()` | 전체 개발 런타임 통합. |
| Nuxt | Nuxt 3 | Vue Router 레코드 | Nuxt/Vue 탐색 이벤트 인식. |
| Astro | Astro 5 | 파일 라우트 | 동일 출처 앵커와 `data-pageflow-to`; island 내부 제외. |
| React Router | 라우트 객체 | 명시적 라우트 객체 | `unplugin-pageflow/react-router` 사용. |
| SvelteKit | SvelteKit 2 | 파일 라우트 | 어댑터가 `sveltekit()`과 결합됨. |
| SolidStart | SolidStart | 파일 라우트 | 어댑터가 Solid 플러그인과 결합됨. |
| Qwik City | Qwik 1.10, Qwik City 1.10 | 파일 라우트 | 어댑터가 Qwik City 및 Vite와 결합됨. |
| Next.js | Next.js 15 | 파일 라우트 | `pageflow-next` 개발 sidecar 사용. |
| uni-app | 현재 Vite 기반 설정 | 생성된 라우트 | 개발 전용. |

## 브라우저 요구 사항

페이지 미리보기에는 동일 출처 iframe 접근과 표준 history, messaging, canvas를 지원하는 최신 브라우저가 필요합니다.

## 프로덕션 지원

PageFlow에는 의도적으로 프로덕션 런타임이 없습니다. 프로덕션 빌드에는 클라이언트나 개발 엔드포인트가 포함되지 않아야 합니다.

## 버전 정책

프레임워크 peer 범위는 지원되는 통합 경계를 나타냅니다. 새로운 주요 프레임워크 버전을 도입할 때 패키지 매니페스트와 CI를 확인하세요.
