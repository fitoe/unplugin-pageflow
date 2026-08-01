# Velké projekty a cache

PageFlow nevykresluje všechny trasy současně jako živé dokumenty. Strategie vykreslování a cache je omezená, aby velké grafy zůstaly prozkoumatelné.

## Vykreslování viewportu

Připojují se pouze blízké DOM náhledy a objekty scény LeaferJS. Vzdálené stránky používají kompaktní zobrazení. Jedna vybraná stránka je povýšena na živý iframe.

## Úrovně miniatur

Blízké stránky mohou mít podrobné náhledy. Vzdálené používají kompaktní miniatury WebP a dlouhé stránky lze rozdělit do dlaždic připojených ve viewportu. Staré miniatury zůstávají viditelné, dokud se nezachytí nové.

## Fronta zachytávání

Před zachycením PageFlow čeká na písma, obrázky a klidný DOM. Práce probíhá po jedné stránce, přičemž vybraná a viditelné stránky mají prioritu.

## Rozložení a vyhledávání

Grafy nad 1 000 stránek mohou přesunout práci s rozložením do Workeru. Prostorový index hledá viditelné stránky bez procházení celého grafu při každé změně viewportu.

## Umístění cache

Trvalé miniatury se ukládají do:

```text
.unplugin-pageflow/cache
```

Cache v paměti a na disku používají pevné limity LRU. Adresář je odstranitelný vývojový výstup a lze ho smazat pro úplně nové zachycení.

## Praktická doporučení

- Seskupujte trasy pomocí smysluplných segmentů cesty.
- Zadávejte stabilní příklady dynamických parametrů.
- Udržujte náhledy deterministické pomocí fixture dat.
- Pro dlouhé asynchronní stránky použijte signál připravenosti.
