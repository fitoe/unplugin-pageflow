# Fonctionnement de PageFlow

PageFlow combine une découverte des routes propre à chaque framework avec un client visuel indépendant du framework.

## 1. Découvrir les routes

L’adaptateur lit la source de routes du framework. Vue Router et Nuxt exposent leurs enregistrements, les frameworks basés sur les fichiers passent par leurs intégrations de build, React Router fournit des objets et Next.js utilise un sidecar de développement.

## 2. Démarrer le runtime de développement

Le plugin injecte un petit runtime uniquement pendant l’exécution du serveur de développement. Il transmet les routes, destinations visibles, titres et états de préparation à PageFlow.

## 3. Afficher les vraies pages

PageFlow ouvre les pages de même origine dans des iframes contrôlés. La page sélectionnée reste active ; les pages en arrière-plan sont capturées dans des caches bornés.

## 4. Détecter la navigation

Les adaptateurs reconnaissent les liens pris en charge, les ancres de même origine, les changements d’historique, les destinations littérales et les indications explicites. Le client les transforme en arêtes orientées et zones actives.

## 5. Disposer le graphe

LeaferJS dessine le canevas. Les piles réduisent les grandes hiérarchies, un index spatial limite le travail au viewport et les grands calculs peuvent être exécutés dans un Worker.

## Builds de production

PageFlow est réservé au développement. Ses endpoints et son client visuel ne sont pas injectés dans la production.

## Limite de sécurité

Le mode aperçu bloque les ancres et formulaires dans son cadre, mais pas les effets de bord d’initialisation. Utilisez des données locales ou de test.
