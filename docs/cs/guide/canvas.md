# Používání plátna

Plátno PageFlow je určené k procházení grafu tras, nikoli k úpravě dat aplikace.

## Pohyb a přiblížení

- Posouváním nebo trackpadem přibližujte kolem ukazatele.
- Tažením prázdného místa plátna přesuňte viewport.
- Vyberte kartu stránky, zaměřte ji a zobrazte její vztahy.
- Pomocí ovládání viewportu porovnejte mobilní a desktopové náhledy.

## Zaměření stránky

Výběr stránky přivede propojené stránky do záběru, převede vybraný náhled na živý iframe a zobrazí aktivní body navigace. Zaměřený pohled je užitečný, když celý graf obsahuje více kontextu, než potřebujete.

## Procházení skupin tras

Trasy se společnými segmenty cesty se mohou zobrazit jako balíček. Otevřete jej a prozkoumejte další úroveň. PageFlow uchovává drobečkovou navigaci aktivní skupiny a animuje přechody, aby zůstal aktuální kontext zřejmý.

## Čtení spojení

Spojení jsou směrovaná. Odchozí čára znamená, že zdrojová stránka obsahuje známý způsob dosažení cíle. Chybějící čára nemusí znamenat nemožnou navigaci: vypočítané cíle se zjistí až po jejich zpřístupnění aplikací.

## Obnovení náhledů

PageFlow zachycuje zastaralé stránky v omezené frontě. Vybraná a viditelné stránky mají přednost. Změny tras a odkazů přicházejí přes HMR, zatímco staré miniatury zůstávají do připravení nových.

## Tipy

- Začněte na domovské nebo hlavní vstupní trase.
- Ve velkých aplikacích otevírejte jednu skupinu tras po druhé.
- Před zaměřením stránek, které při inicializaci zapisují, použijte testovací data.
- Pokud stránka není nikdy připravená, přidejte [explicitní signál připravenosti](/cs/reference/configuration#připravenost-náhledu).
