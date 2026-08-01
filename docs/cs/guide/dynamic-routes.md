# Dynamické trasy

Trasu jako `/products/:id` nelze vykreslit, dokud PageFlow nezná bezpečnou hodnotu `id`. Reprezentativní hodnoty nastavte pomocí `dynamicParams`.

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

## Shoda

Jako klíč objektu použijte vzor trasy poskytnutý adaptérem frameworku. Každý pojmenovaný parametr vyžadovaný vzorem musí mít hodnotu.

## Řetězce dotazu a hashe

PageFlow uchovává nalezené řetězce dotazu a hashe jako navigační pozice. Mohou představovat karty, filtry nebo kotvy, zatímco podkladová trasa zůstává stejná.

```text
/products/demo-product?tab=history#activity
```

## Volba ukázkových hodnot

Používejte stabilní identifikátory založené na lokálních fixtures nebo testovacích datech. Vyhněte se skutečným ID zákazníků a stránkám, které mohou při inicializaci provést nevratný zápis.

Dynamické parametry pouze sestavují URL. Neobcházejí ověřování, oprávnění, loadery ani validaci aplikace.

## Řešení problémů

Pokud se dynamická stránka stále nevykreslí:

1. Ověřte, že nastavený klíč přesně odpovídá vzoru trasy frameworku.
2. Zadejte všechny povinné parametry.
3. Otevřete vytvořenou URL přímo ve stejné relaci prohlížeče.
4. Zkontrolujte, zda požadavek nepřesměrovává ověřování nebo loader.
