# Řešení problémů

## Nezobrazují se žádné trasy

- Ověřte, že jste nainstalovali adaptér odpovídající routeru aplikace.
- Zkontrolujte, že PageFlow běží na vývojovém serveru, ne v produkčním náhledu.
- U prostého Vite bez kontrolovatelného routeru zadejte explicitní trasy, pokud to integrace podporuje.

## Dynamická stránka se neotevře

Přidejte bezpečné ukázkové hodnoty do `dynamicParams`. Zkontrolujte vzor trasy a otevřete vytvořenou URL přímo, abyste odhalili přesměrování ověřování nebo loaderu.

## Náhled zůstává prázdný nebo se načítá

- Zkontrolujte konzoli aplikace a síťové požadavky.
- Ověřte, že se stránka vykreslí v aktuální relaci prohlížeče.
- Počkejte na potřebná písma a obrázky.
- U dlouhé asynchronní práce zavolejte po připravení stránky `window.__UNPLUGIN_PAGEFLOW_READY__?.()`.

## Chybí navigace

PageFlow zjišťuje podporované odkazy a literální cíle. Vypočítané programové cíle se mohou objevit až po interakci. Vnitřek Astro islands se záměrně nekontroluje; podle potřeby použijte kotvu stejného původu nebo `data-pageflow-to`.

## Miniatury jsou zastaralé

Nechte frontu zachytávání obnovit viditelné stránky. Pokud cache už není užitečná, zastavte vývojový server a odstraňte `.unplugin-pageflow/cache`.

## Zobrazují se stránky ověřování

Ověřování pochází z aktuální relace prohlížeče. Přihlaste se do lokální aplikace ve stejné relaci nebo považujte očekávanou přihlašovací stránku či odmítnutí přístupu za správný náhled.

## Testy se nepřiřazují

Zkontrolujte pravidla automatického přiřazení a přidejte explicitní mapování `pageTests`. Test lze spustit jen tehdy, pokud má jeho typ nastavenou položku `testCommands`.

## Sidecar Next.js selhává

Ověřte, že aplikace běží, hostitel a port sidecaru jsou dostupné a obě rozhraní používají očekávané nastavení stejného původu. Viz [průvodce Next.js](/cs/integrations/next).
