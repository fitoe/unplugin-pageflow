# Limites et sécurité

PageFlow affiche de vraies pages pendant le développement. Traitez les aperçus comme des visites normales de l’application locale.

## Ce que fait PageFlow

- Découvre les routes exposées par l’adaptateur.
- Affiche des aperçus de même origine.
- Détecte les liens et destinations pris en charge.
- Bloque les ancres et formulaires dans le mode aperçu.
- Exclut son runtime des builds de production.

## Ce que PageFlow ne fait pas

- Il ne contourne ni l’authentification ni l’autorisation.
- Il ne clique pas automatiquement sur les contrôles.
- Il ne supprime pas les effets de bord du démarrage.
- Il ne peut pas déduire toutes les destinations calculées avant l’interaction.
- Il n’inspecte pas les internes des islands Astro.

## Utiliser des données sûres

Utilisez des données locales ou de test pour les pages qui écrivent pendant l’initialisation. Ne configurez jamais de vrais mots de passe, jetons, codes ou autres secrets comme état d’aperçu.

L’authentification et l’état propre aux routes viennent de la session actuelle. Sans permission, une page peut afficher normalement la connexion ou le refus d’accès.
