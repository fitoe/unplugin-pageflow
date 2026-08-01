# Jak PageFlow funguje

PageFlow kombinuje zjišťování tras specifické pro framework s vizuálním klientem nezávislým na frameworku.

## 1. Zjištění tras

Vybraný adaptér čte zdroj tras frameworku. Vue Router a Nuxt poskytují záznamy routeru; frameworky založené na souborech předávají trasy prostřednictvím integrace sestavení; React Router přijímá objekty tras; Next.js používá vývojový sidecar.

## 2. Spuštění vývojového runtime

Plugin vkládá malý runtime pouze během běhu vývojového serveru. Endpointu PageFlow hlásí informace o trasách, viditelné navigační cíle, názvy stránek a připravenost.

## 3. Vykreslení skutečných stránek

PageFlow otevírá stránky aplikace stejného původu v řízených iframe. Vybraná stránka zůstává živá, zatímco stránky na pozadí se zachycují do omezené cache miniatur.

## 4. Zjištění navigace

Adaptéry rozpoznávají podporované odkazy frameworku, kotvy stejného původu, změny historie, literální programové cíle a explicitní navigační nápovědy. Klient je převádí na směrované hrany grafu a aktivní body náhledu.

## 5. Rozložení grafu

LeaferJS vykresluje plátno. Balíčky tras zjednodušují velké hierarchie, prostorový index omezuje práci ve viewportu a velká rozložení mohou běžet ve Workeru.

## Produkční sestavení

PageFlow je určený pouze pro vývoj. Jeho runtime endpointy ani vizuální klient se nevkládají do produkčního výstupu. Kontrola produkčního výstupu v repozitáři tuto hranici ověřuje.

## Bezpečnostní hranice

Režim náhledu blokuje navigaci kotvou a odesílání formulářů v řízeném frame, ale nepotlačuje vedlejší účinky inicializace aplikace. Používejte lokální nebo testovací data.
