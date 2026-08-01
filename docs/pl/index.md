---
layout: home

title: PageFlow
titleTemplate: Cała aplikacja na pierwszy rzut oka
description: Umieść wszystkie strony i ścieżki między nimi na jednej przejrzystej, zawsze aktualnej planszy.

hero:
  name: PageFlow
  text: Cała aplikacja na pierwszy rzut oka.
  tagline: Im więcej stron, tym trudniej śledzić nawigację. PageFlow umieszcza wszystkie strony i ścieżki między nimi na jednej przejrzystej planszy.
  image:
    src: /pageflow-demo.svg?v=20260801-20
    alt: Animowana mapa PageFlow porządkująca strony aplikacji i ścieżki nawigacji
  actions:
    - theme: brand
      text: Zacznij
      link: /pl/guide/getting-started
    - theme: alt
      text: Zobacz na GitHubie
      link: https://github.com/fitoe/unplugin-pageflow

features:
  - icon: 🗺️
    title: Cała witryna
    details: Zbierz wszystkie strony na jednej mapie i zrozum strukturę nawet dużej witryny na pierwszy rzut oka.
  - icon: 🖥️
    title: Prawdziwe strony
    details: Zobacz interfejs faktycznie renderowany przez kod zamiast polegać na nieaktualnych zrzutach i diagramach.
  - icon: 🔀
    title: Przepływy stron
    details: Śledź połączenia stron i szybko ustalaj, skąd przychodzą użytkownicy oraz dokąd mogą przejść.
  - icon: 🔌
    title: API stron
    details: Zobacz, które API wywołuje każda strona i co te API rzeczywiście zwracają.
  - icon: 🧪
    title: Testy stron
    details: Trzymaj testy obok stron, aby łatwo dostrzec pokrycie i pozostałe ryzyka.
  - icon: 🔄
    title: Zawsze zsynchronizowane
    details: Strony, nawigacja, API i testy aktualizują się wraz z rozwojem bez ręcznego utrzymywania mapy witryny.
---

<FrameworkGrid bundler-title="Obsługiwane bundlery" title="Obsługiwane frameworki" link="/pl/integrations/" />

## Więcej stron, mniejsza widoczność

Wraz z rozwojem aplikacji nikt nie widzi jej w całości w jednym miejscu. Programiści czytają pliki tras, projektanci sprawdzają makiety, testerzy podążają za przypadkami testowymi, a każdy przechowuje część przepływu w głowie. Te obrazy szybko się rozchodzą.

PageFlow odczytuje działającą aplikację i układa jej rzeczywiste strony oraz linki. Jeden widok pokazuje, co istnieje, dokąd mogą przejść użytkownicy i które strony mają testy.

## Zacznij w kilka minut

```bash
pnpm add -D unplugin-pageflow
```

Dodaj PageFlow do konfiguracji deweloperskiej, uruchom aplikację i otwórz URL wyświetlony przez plugin.

[Przeczytaj przewodnik startowy →](/pl/guide/getting-started)

## Poznaj PageFlow

### Naucz się przepływu pracy

- [Poznaj strony, linki, aktywne obszary, podglądy i grupy tras](/pl/guide/concepts)
- [Poruszaj się po nieskończonej planszy](/pl/guide/canvas)
- [Podaj bezpieczne wartości dla tras dynamicznych](/pl/guide/dynamic-routes)
- [Zachowuj natywne kontrolki i stan aplikacji](/pl/guide/state)

### Połącz narzędzia deweloperskie

- [Przypisuj i uruchamiaj testy stron](/pl/guide/page-tests)
- [Obsługuj duże projekty dzięki ograniczonemu renderowaniu i pamięci podręcznej](/pl/guide/large-projects)
- [Dowiedz się, jak działa wykrywanie tras i podglądów](/pl/guide/how-it-works)

### Znajdź odpowiedzi

- [Sprawdź zgodność frameworków](/pl/reference/compatibility)
- [Rozwiąż problemy z podglądami, trasami, nawigacją i testami](/pl/guide/troubleshooting)
- [Przeczytaj często zadawane pytania](/pl/guide/faq)
