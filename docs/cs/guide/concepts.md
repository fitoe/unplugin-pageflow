# Základní pojmy

PageFlow mění trasy a navigační cíle aplikace na prozkoumatelný graf. Pět pojmů zpřehlední celé rozhraní.

## Stránky

Stránka představuje jednu konkrétní trasu, kterou PageFlow dokáže vykreslit. Statické trasy jsou připravené okamžitě. Dynamické lze vykreslit po zadání reprezentativních hodnot parametrů.

Každá stránka může mít název, cestu trasy, náhled, miniaturu, navigační odkazy a přiřazené testy. Řetězce dotazu a hashe mohou zachovat přesnější navigační pozici bez vytváření samostatných definic tras.

## Navigační odkazy

Odkaz je směrovaný vztah z jedné stránky na druhou. PageFlow dokáže najít podporované odkazy routeru, kotvy stejného původu, literální programové cíle, navigaci historií prohlížeče a explicitní nápovědy frameworku, například `data-pageflow-to`.

Vypočítané cíle mohou být známé až poté, co aplikace provede příslušnou interakci.

## Aktivní body

Po výběru stránky PageFlow zvýrazní prvky, které vedou ke známé navigaci. Aktivní body propojují vizuální náhled s grafem: ukazují nejen vztah dvou tras, ale také místo, kde přechod ve skutečném rozhraní začíná.

## Náhledy a miniatury

Vybraná stránka používá živý iframe stejného původu. Ostatní blízké stránky používají zachycené náhledy, aby plátno zůstalo rychlé. Miniatury z cache jsou viditelné, zatímco se zastaralé stránky aktualizují na pozadí.

## Skupiny tras

Velké stromy tras se sbalují do balíčků. Otevřete balíček a prohlédněte si potomky, pak se pomocí drobečkové navigace vraťte k předkovi. Seskupení snižuje vizuální šum bez ztráty vztahů mezi stránkami.

## Dále

- [Naučte se ovládat plátno](/cs/guide/canvas)
- [Nastavte dynamické trasy](/cs/guide/dynamic-routes)
- [Zjistěte, jak PageFlow funguje](/cs/guide/how-it-works)
