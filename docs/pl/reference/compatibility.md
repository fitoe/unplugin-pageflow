# Zgodność

PageFlow wymaga Node.js 20.19 lub nowszego. Zainstaluj go jako zależność deweloperską.

| Integracja | Minimalna wersja peer | Źródło tras | Uwagi |
| --- | --- | --- | --- |
| Vite + Vue Router | Vite 5, Vue 3.4, Vue Router 4 | `router.getRoutes()` | Pełna integracja z runtime deweloperskim. |
| Nuxt | Nuxt 3 | Rekordy Vue Router | Rozpoznaje zdarzenia nawigacji Nuxt/Vue. |
| Astro | Astro 5 | Trasy plikowe | Kotwice tego samego źródła i `data-pageflow-to`; bez wnętrza islands. |
| React Router | Obiekty tras | Jawne obiekty tras | Użyj `unplugin-pageflow/react-router`. |
| SvelteKit | SvelteKit 2 | Trasy plikowe | Adapter łączy się z `sveltekit()`. |
| SolidStart | SolidStart | Trasy plikowe | Adapter łączy się z pluginem Solid. |
| Qwik City | Qwik 1.10, Qwik City 1.10 | Trasy plikowe | Adapter łączy się z Qwik City i Vite. |
| Next.js | Next.js 15 | Trasy plikowe | Używa deweloperskiego sidecara `pageflow-next`. |
| uni-app | Współczesna konfiguracja oparta na Vite | Wygenerowane trasy | Tylko do programowania. |

## Wymagania przeglądarki

Podglądy stron wymagają dostępu do iframe tego samego źródła i nowoczesnej przeglądarki ze standardową obsługą history, messaging i canvas.

## Obsługa produkcji

PageFlow celowo nie ma runtime produkcyjnego. Buildy produkcyjne nie powinny zawierać klienta ani endpointów deweloperskich.

## Polityka wersji

Zakresy peer frameworków opisują granice obsługiwanych integracji. Przy wdrażaniu nowych wersji głównych sprawdź manifest pakietu i CI.
