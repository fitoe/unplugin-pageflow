# Dynamische Routen

Eine Route wie `/products/:id` kann erst gerendert werden, wenn PageFlow einen sicheren Wert für `id` kennt. Repräsentative Werte werden mit `dynamicParams` konfiguriert.

```ts
PageFlow.vite({
  dynamicParams: {
    '/products/:id': { id: 'demo-product' },
    '/users/:userId/orders/:orderId': {
      userId: 'alice',
      orderId: 'order-100',
    },
  },
})
```

## Zuordnung

Das vom Framework-Adapter bereitgestellte Routenmuster als Objektschlüssel verwenden. Jeder vom Muster benötigte benannte Parameter sollte einen Wert besitzen.

## Query-Strings und Hashes

PageFlow behält erkannte Query-Strings und Hashes als Navigationsorte bei. Sie können Tabs, Filter oder Anker darstellen, während die zugrunde liegende Route gleich bleibt.

```text
/products/demo-product?tab=history#activity
```

## Beispielwerte wählen

Stabile Kennungen aus lokalen Fixtures oder Testdaten verwenden. Produktions-Kundenkennungen und Seiten vermeiden, die während der Initialisierung unumkehrbare Schreibvorgänge ausführen können.

Dynamische Parameter erzeugen lediglich eine URL. Sie umgehen weder Authentifizierung und Autorisierung noch Loader oder Anwendungsvalidierung.

## Fehlerbehebung

Wenn eine dynamische Seite weiterhin nicht gerendert wird:

1. Prüfen, ob der konfigurierte Schlüssel exakt dem Routenmuster des Frameworks entspricht.
2. Alle erforderlichen Parameter angeben.
3. Die erzeugte URL direkt in derselben Browsersitzung öffnen.
4. Prüfen, ob Authentifizierung oder ein Loader die Anfrage umleitet.
