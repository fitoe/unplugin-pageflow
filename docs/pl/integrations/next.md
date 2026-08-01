# Next.js

Next.js nie udostępnia interfejsu pluginu Vite, dlatego PageFlow używa sidecara tego samego źródła wyłącznie do programowania.

## Przygotowanie PageFlow

Zainstaluj pakiet jako zależność deweloperską i upewnij się, że aplikacja Next.js działa.

```bash
pnpm add -D unplugin-pageflow
pnpm next dev
```

## Uruchamianie sidecara

Uruchom CLI z katalogu głównego aplikacji:

```bash
pageflow-next --dir . --host 127.0.0.1 --port 3000
```

CLI wykryje obsługiwane trasy plikowe Next.js i wyświetli URL PageFlow.

## Opcje

- `--dir` wybiera katalog projektu Next.js.
- `--host` wybiera host deweloperski.
- `--port` określa port deweloperski Next.js używany przez sidecar.

## Tylko do programowania

Sidecar nie jest częścią `next build` i nie korzysta z niego serwer produkcyjny. Trzymaj go w lokalnych skryptach deweloperskich, nie w definicjach procesów produkcyjnych.

## Rozwiązywanie problemów

- Uruchom Next.js przed otwarciem podglądów stron.
- Użyj dostępnego hosta i portu.
- Sprawdź, czy strony renderują się bezpośrednio w tej samej sesji przeglądarki.
- Używaj lokalnego lub testowego uwierzytelniania i danych.
