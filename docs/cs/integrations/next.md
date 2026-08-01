# Next.js

Next.js neposkytuje rozhraní pluginu Vite, proto PageFlow používá sidecar stejného původu určený pouze pro vývoj.

## Příprava PageFlow

Nainstalujte balíček jako vývojovou závislost a ověřte, že aplikace Next.js běží.

```bash
pnpm add -D unplugin-pageflow
pnpm next dev
```

## Spuštění sidecaru

Spusťte CLI z kořene aplikace:

```bash
pageflow-next --dir . --host 127.0.0.1 --port 3000
```

CLI zjistí podporované souborové trasy Next.js a vypíše URL PageFlow.

## Možnosti

- `--dir` vybírá adresář projektu Next.js.
- `--host` vybírá vývojového hostitele.
- `--port` určuje vývojový port Next.js použitý sidecarem.

## Pouze pro vývoj

Sidecar není součástí `next build` a produkční server jej nepoužívá. Uchovávejte jej v lokálních vývojových skriptech, ne v definicích produkčních procesů.

## Řešení problémů

- Spusťte Next.js před otevřením náhledů stránek.
- Použijte dostupného hostitele a port.
- Ověřte, že se stránky vykreslí přímo ve stejné relaci prohlížeče.
- Používejte lokální nebo testovací ověřování a data.
