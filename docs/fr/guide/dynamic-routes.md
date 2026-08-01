# Routes dynamiques

Une route comme `/products/:id` ne peut être affichée tant que PageFlow ne connaît pas une valeur sûre pour `id`. Configurez des valeurs représentatives avec `dynamicParams`.

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

## Correspondance

Utilisez comme clé le modèle de route exposé par l’adaptateur. Tous les paramètres nommés requis doivent avoir une valeur.

## Requêtes et fragments

PageFlow conserve les paramètres de requête et fragments détectés comme emplacements de navigation. Ils peuvent représenter des onglets, filtres ou ancres sans changer la route sous-jacente.

```text
/products/demo-product?tab=history#activity
```

## Choisir les valeurs

Utilisez des identifiants stables provenant de fixtures locales ou de données de test. Évitez les identifiants de clients réels et les pages pouvant effectuer des écritures irréversibles à l’initialisation.

Les paramètres dynamiques construisent uniquement une URL. Ils ne contournent ni l’authentification, ni l’autorisation, ni les loaders, ni la validation.

## Résolution des problèmes

1. Vérifiez que la clé correspond exactement au modèle de route.
2. Fournissez chaque paramètre requis.
3. Ouvrez directement l’URL générée dans la même session.
4. Vérifiez si l’authentification ou un loader redirige la requête.
