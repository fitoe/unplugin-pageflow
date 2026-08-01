# Časté dotazy

## Běží PageFlow v produkci?

Ne. PageFlow je vývojový nástroj. Jeho runtime a endpointy jsou z produkčních sestavení vyloučené.

## Nahrazuje router nebo spouštěč testů?

Ne. Čte trasy z podporovaných integrací a spouští pouze testovací příkazy, které výslovně nastavíte.

## Dokáže obejít ověřování?

Ne. Náhledy používají aktuální relaci prohlížeče a běžné oprávnění aplikace.

## Kliká PageFlow automaticky na všechny ovládací prvky?

Ne. Zjišťuje podporované navigační cíle, ale neprochází produkt automatickým klikáním.

## Proč chybí vypočítaný cíl?

Cíl sestavený za běhu nemusí existovat před příslušnou interakcí. Použijte podporovaný odkaz nebo explicitní nápovědu, pokud ji adaptér frameworku umožňuje.

## Mohou náhledy měnit data?

Inicializační kód aplikace se stále spouští. Režim náhledu blokuje navigaci kotvou a odesílání formulářů v řízeném frame, ale nedokáže zabránit vedlejším účinkům inicializace. Používejte lokální nebo testovací data.

## Kde se ukládají miniatury?

Trvalé miniatury jsou v `.unplugin-pageflow/cache`. Adresář lze bezpečně odstranit při zastaveném vývojovém serveru.

## Které frameworky jsou podporované?

Podívejte se na aktuální [matici kompatibility](/cs/reference/compatibility).

## Jak nahlásím chybu?

Otevřete issue na [GitHubu](https://github.com/fitoe/unplugin-pageflow/issues) a uveďte framework, verze, minimální konfiguraci, vzor trasy a relevantní výstup konzole.
