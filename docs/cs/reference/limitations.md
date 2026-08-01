# Omezení a bezpečnost

PageFlow během vývoje vykresluje skutečné stránky aplikace. Zacházejte s náhledy jako s běžnými návštěvami lokální aplikace.

## Co PageFlow dělá

- Zjišťuje trasy poskytované vybraným adaptérem frameworku.
- Vykresluje náhledy stránek stejného původu.
- Zjišťuje podporované odkazy a navigační cíle.
- V režimu náhledu blokuje navigaci kotvou a odesílání formulářů.
- Nezahrnuje svůj runtime do produkčních sestavení.

## Co PageFlow nedělá

- Neobchází ověřování ani oprávnění.
- Nekliká automaticky na ovládací prvky.
- Nepotlačuje vedlejší účinky spuštění aplikace.
- Nedokáže odvodit každý vypočítaný cíl před příslušnou interakcí.
- Nekontroluje vnitřní strukturu Astro islands.

## Používejte bezpečná data

Pro stránky, které při inicializaci zapisují, používejte lokální nebo testovací data. Nenastavujte skutečná hesla, tokeny, ověřovací kódy ani jiná tajemství jako stav náhledu.

Ověřování a stav konkrétní trasy pocházejí z aktuální relace prohlížeče. Stránka bez oprávnění může zobrazit běžné přihlášení nebo zamítnutí přístupu.
