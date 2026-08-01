---
layout: home

title: PageFlow
titleTemplate: Celá aplikace na první pohled
description: Zobrazte všechny stránky a cesty mezi nimi na jednom přehledném a vždy aktuálním plátně.

hero:
  name: PageFlow
  text: Celá aplikace na první pohled.
  tagline: S rostoucím počtem stránek je navigace stále méně přehledná. PageFlow zobrazí všechny stránky a cesty mezi nimi na jednom jasném plátně.
  image:
    src: /pageflow-demo.svg?v=20260801-20
    alt: Animovaná mapa PageFlow uspořádávající stránky aplikace a navigační cesty
  actions:
    - theme: brand
      text: Začít
      link: /cs/guide/getting-started
    - theme: alt
      text: Zobrazit na GitHubu
      link: https://github.com/fitoe/unplugin-pageflow

features:
  - icon: 🗺️
    title: Celý web
    details: Spojte všechny stránky do jedné mapy a pochopte na první pohled strukturu i rozsáhlého webu.
  - icon: 🖥️
    title: Skutečné stránky
    details: Sledujte rozhraní, které kód opravdu vykresluje, místo zastaralých snímků a diagramů.
  - icon: 🔀
    title: Toky mezi stránkami
    details: Sledujte propojení stránek a rychle zjistěte, odkud uživatelé přicházejí a kam mohou pokračovat.
  - icon: 🔌
    title: API stránek
    details: Zjistěte, která API každá stránka volá a co skutečně vracejí.
  - icon: 🧪
    title: Testy stránek
    details: Mějte testy vedle jejich stránek, aby bylo snadné vidět pokrytí i zbývající rizika.
  - icon: 🔄
    title: Vždy synchronizované
    details: Stránky, navigace, API a testy se aktualizují s vývojem bez ručně spravované mapy webu.
---

<FrameworkGrid bundler-title="Podporované bundlery" title="Podporované frameworky" link="/cs/integrations/" />

## Více stránek, menší přehled

Jak aplikace roste, nikdo ji nevidí celou na jednom místě. Vývojáři čtou soubory tras, designéři kontrolují návrhy, testeři sledují testovací scénáře a každý si část toku drží v hlavě. Tyto pohledy se rychle rozcházejí.

PageFlow čte spuštěnou aplikaci a společně rozloží její skutečné stránky a odkazy. Jediný pohled ukáže, co existuje, kam mohou uživatelé přejít a které stránky mají testy.

## Začněte během několika minut

```bash
pnpm add -D unplugin-pageflow
```

Přidejte PageFlow do vývojové konfigurace, spusťte aplikaci a otevřete URL vypsanou pluginem.

[Přečíst průvodce začátkem →](/cs/guide/getting-started)

## Prozkoumejte PageFlow

### Poznejte pracovní postup

- [Pochopte stránky, odkazy, aktivní body, náhledy a skupiny tras](/cs/guide/concepts)
- [Pohybujte se na nekonečném plátně](/cs/guide/canvas)
- [Zadejte bezpečné hodnoty dynamických tras](/cs/guide/dynamic-routes)
- [Zachovejte nativní prvky a stav aplikace](/cs/guide/state)

### Propojte vývojové nástroje

- [Přiřaďte a spouštějte testy stránek](/cs/guide/page-tests)
- [Zvládněte velké projekty pomocí omezeného vykreslování a cache](/cs/guide/large-projects)
- [Zjistěte, jak funguje zjišťování tras a náhledy](/cs/guide/how-it-works)

### Najděte odpovědi

- [Zkontrolujte kompatibilitu frameworků](/cs/reference/compatibility)
- [Vyřešte problémy s náhledy, trasami, navigací a testy](/cs/guide/troubleshooting)
- [Přečtěte si časté dotazy](/cs/guide/faq)
