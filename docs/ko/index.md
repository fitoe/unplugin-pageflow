---
layout: home

title: PageFlow
titleTemplate: 앱 전체를 한눈에
description: 모든 페이지와 페이지 사이의 경로를 명확하고 항상 최신인 하나의 캔버스에 표시합니다.

hero:
  name: PageFlow
  text: 앱 전체를 한눈에 확인하세요.
  tagline: 페이지가 늘어날수록 탐색 흐름을 파악하기 어려워집니다. PageFlow는 모든 페이지와 연결 경로를 하나의 명확한 캔버스에 펼쳐 보여 줍니다.
  image:
    src: /pageflow-demo.svg?v=20260801-20
    alt: 애플리케이션 페이지와 탐색 경로를 재배치하는 PageFlow 애니메이션 지도
  actions:
    - theme: brand
      text: 시작하기
      link: /ko/guide/getting-started
    - theme: alt
      text: GitHub에서 보기
      link: https://github.com/fitoe/unplugin-pageflow

features:
  - icon: 🗺️
    title: 사이트 전체
    details: 모든 페이지를 하나의 지도에 모아 큰 웹사이트의 구조도 한눈에 이해할 수 있습니다.
  - icon: 🖥️
    title: 실제 페이지
    details: 오래된 스크린샷이나 다이어그램 대신 코드가 실제로 렌더링하는 화면을 확인합니다.
  - icon: 🔀
    title: 페이지 흐름
    details: 페이지가 어떻게 연결되는지 따라가며 사용자가 어디에서 오고 어디로 갈 수 있는지 빠르게 파악합니다.
  - icon: 🔌
    title: 페이지 API
    details: 각 페이지가 호출하는 API와 실제 반환 데이터를 확인합니다.
  - icon: 🧪
    title: 페이지 테스트
    details: 테스트를 해당 페이지와 함께 표시하여 커버리지와 남은 위험을 쉽게 찾습니다.
  - icon: 🔄
    title: 항상 동기화
    details: 수동 사이트맵 없이 페이지, 탐색, API, 테스트가 개발 과정에 맞춰 갱신됩니다.
---

<FrameworkGrid bundler-title="지원 번들러" title="지원 프레임워크" link="/ko/integrations/" />

## 페이지는 늘고, 전체 모습은 흐려집니다

앱이 커지면 누구도 전체를 한곳에서 보기 어렵습니다. 개발자는 라우트 파일을 읽고, 디자이너는 시안을 확인하며, 테스터는 테스트 케이스를 따라갑니다. 각자 머릿속에 흐름의 일부만 담고 있어 이런 관점은 빠르게 어긋납니다.

PageFlow는 실행 중인 앱을 읽어 실제 페이지와 링크를 함께 배치합니다. 하나의 화면에서 무엇이 존재하고, 사용자가 어디로 이동할 수 있으며, 어떤 페이지에 테스트가 있는지 파악할 수 있습니다.

## 몇 분 만에 시작하기

```bash
pnpm add -D unplugin-pageflow
```

개발 설정에 PageFlow를 추가하고 애플리케이션을 시작한 다음 플러그인이 출력한 URL을 여세요.

[시작 가이드 읽기 →](/ko/guide/getting-started)

## PageFlow 살펴보기

### 작업 방식 이해하기

- [페이지, 링크, 핫스팟, 미리보기, 라우트 그룹 이해하기](/ko/guide/concepts)
- [무한 캔버스 탐색하기](/ko/guide/canvas)
- [동적 라우트에 안전한 값 제공하기](/ko/guide/dynamic-routes)
- [네이티브 컨트롤과 애플리케이션 상태 보존하기](/ko/guide/state)

### 개발 도구 연결하기

- [페이지 테스트 연결 및 실행하기](/ko/guide/page-tests)
- [제한된 렌더링과 캐시로 대규모 프로젝트 지원하기](/ko/guide/large-projects)
- [라우트 탐색과 미리보기 작동 방식 알아보기](/ko/guide/how-it-works)

### 답 찾기

- [프레임워크 호환성 확인하기](/ko/reference/compatibility)
- [미리보기, 라우트, 탐색, 테스트 문제 해결하기](/ko/guide/troubleshooting)
- [자주 묻는 질문 읽기](/ko/guide/faq)
