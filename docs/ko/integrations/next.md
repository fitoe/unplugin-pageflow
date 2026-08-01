# Next.js

Next.js는 Vite 플러그인 인터페이스를 제공하지 않으므로 PageFlow는 개발 전용 동일 출처 sidecar를 사용합니다.

## PageFlow 준비

패키지를 개발 의존성으로 설치하고 Next.js 애플리케이션이 실행 중인지 확인합니다.

```bash
pnpm add -D unplugin-pageflow
pnpm next dev
```

## sidecar 시작

애플리케이션 루트에서 CLI를 실행합니다.

```bash
pageflow-next --dir . --host 127.0.0.1 --port 3000
```

CLI가 지원되는 Next.js 파일 라우트를 찾고 PageFlow URL을 출력합니다.

## 옵션

- `--dir`은 Next.js 프로젝트 디렉터리를 선택합니다.
- `--host`는 개발 호스트를 선택합니다.
- `--port`는 sidecar 설정에서 사용할 Next.js 개발 포트를 지정합니다.

## 개발 전용

sidecar는 `next build`의 일부가 아니며 프로덕션 서버에서 사용되지 않습니다. 프로덕션 프로세스 정의가 아닌 로컬 개발 스크립트에 두세요.

## 문제 해결

- 페이지 미리보기를 열기 전에 Next.js를 시작하세요.
- 사용 가능한 호스트와 포트를 선택하세요.
- 같은 브라우저 세션에서 페이지가 직접 렌더링되는지 확인하세요.
- 로컬 또는 테스트 인증과 데이터를 사용하세요.
