# 페이지 테스트

PageFlow는 라우트를 단위, 컴포넌트, 엔드투엔드 테스트와 연결하고 선택한 페이지에서 명시적으로 설정된 명령을 실행할 수 있습니다.

## 자동 연결

테스트가 페이지 컴포넌트를 import하거나, 같은 이름 규칙을 따르거나, 테스트 케이스에서 전체 라우트로 이동하면 연결될 수 있습니다. PageFlow는 각 연결이 만들어진 이유를 표시합니다.

## 명시적 매핑

자동 연결이 모호할 때 라우트와 파일 glob을 사용하세요.

```ts
PageFlow.vite({
  pageTests: {
    '/orders/**': ['tests/orders-*.spec.ts'],
  },
})
```

## 테스트 명령

기본적으로 어떤 명령도 추측하거나 활성화하지 않습니다. 지원할 테스트 종류마다 명시적으로 설정하세요.

```ts
PageFlow.vite({
  testCommands: {
    unit: {
      command: 'pnpm',
      args: ['vitest', 'run', '{file}', '-t', '{name}'],
    },
    component: {
      command: 'pnpm',
      args: ['vitest', 'run', '{file}', '-t', '{name}'],
    },
    e2e: {
      command: 'pnpm',
      args: ['playwright', 'test', '{file}', '-g', '{name}'],
      timeoutMs: 180_000,
    },
  },
})
```

`{file}`과 `{name}`은 인덱싱된 값으로 바뀝니다. 명령은 프로젝트 루트에서 `shell: false`로 실행됩니다. 기본 테스트 제한 시간은 120초이며 `timeoutMs`에는 1초부터 30분까지 지정할 수 있습니다.

## 결과

페이지 패널은 알 수 없음, 실행 중, 성공, 실패, 건너뜀, 취소 상태를 표시합니다. 실행 중인 테스트는 PageFlow에서 취소할 수 있습니다. 테스트 출력은 개발에만 사용되며 프로덕션 번들에 포함되지 않습니다.
