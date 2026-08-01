# 설정

PageFlow 어댑터에 옵션을 전달합니다.

```ts
PageFlow.vite({
  enabled: true,
  previewPath: '/__unplugin-pageflow/',
  appUrl: '/',
  dynamicParams: {
    '/products/:id': { id: 'demo-product' },
  },
})
```

## 옵션

| 옵션 | 기본값 | 설명 |
| --- | --- | --- |
| `enabled` | `true` | 개발 서버에서 PageFlow를 활성화합니다. |
| `previewPath` | `/__unplugin-pageflow/` | 시각적 지도에서 사용하는 URL입니다. |
| `appUrl` | `/` | 애플리케이션 라우터를 찾는 데 사용하는 라우트입니다. |
| `dynamicParams` | `{}` | 동적 라우트 매개변수의 예시 값을 제공합니다. |
| `pageTests` | `{}` | 라우트 glob을 테스트 파일 glob과 명시적으로 연결합니다. |
| `testCommands` | `{}` | 명시적인 shell 없는 명령으로 테스트 종류별 실행을 활성화합니다. |

## 페이지 테스트

PageFlow는 페이지 컴포넌트를 import하거나, 같은 이름의 테스트 파일을 사용하거나, 테스트 케이스에서 전체 라우트로 이동하는 테스트를 자동 연결합니다. 모호한 테스트는 명시적으로 매핑할 수 있습니다.

```ts
PageFlow.vite({
  pageTests: {
    '/orders/**': ['tests/orders-*.spec.ts'],
  },
  testCommands: {
    unit: { command: 'pnpm', args: ['vitest', 'run', '{file}', '-t', '{name}'] },
    component: { command: 'pnpm', args: ['vitest', 'run', '{file}', '-t', '{name}'] },
    e2e: { command: 'pnpm', args: ['playwright', 'test', '{file}', '-g', '{name}'], timeoutMs: 180_000 },
  },
})
```

`{file}`과 `{name}`은 인덱싱된 테스트 파일과 케이스 이름으로 바뀝니다. 명령은 프로젝트 루트에서 `shell: false`로 실행되며 기본적으로 어떤 테스트 명령도 추측하거나 활성화하지 않습니다. 테스트 하나의 기본 제한 시간은 120초이고 `timeoutMs`는 1초부터 30분까지 설정할 수 있습니다.

PageFlow는 최근 500개 테스트 결과를 `.unplugin-pageflow/cache/test-results.json`에 저장합니다. 테스트 파일 내용이 바뀌면 이전 결과는 자동으로 무효화됩니다. 저장 출력은 테스트당 마지막 20KB로 제한되며 캐시 디렉터리는 Git에서 계속 무시해야 합니다.

## 동적 라우트 매개변수

PageFlow가 `/products/:id` 같은 라우트를 렌더링하려면 구체적인 값이 필요합니다.

```ts
PageFlow.vite({
  dynamicParams: {
    '/products/:id': {
      id: 'demo-product',
    },
    '/users/:userId/orders/:orderId': {
      userId: 'alice',
      orderId: 'order-100',
    },
  },
})
```

안전한 로컬 또는 테스트 식별자를 사용하세요. 동적 매개변수는 애플리케이션 인증을 우회하지 않습니다.

## 미리보기 준비

PageFlow는 페이지를 캡처하기 전에 글꼴과 이미지 로드 및 DOM 안정화를 기다립니다. 비동기 작업이 오래 걸리는 페이지는 준비 상태를 명시적으로 알릴 수 있습니다.

```ts
window.__UNPLUGIN_PAGEFLOW_READY__?.()
```
