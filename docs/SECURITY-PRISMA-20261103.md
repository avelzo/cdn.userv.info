# Correctif Prisma — 3 novembre 2026

Les trois entrées élevées viennent de la seule chaîne Prisma/config/deepmerge-ts,
avis [GHSA-ggr8-5vv4-36mx](https://github.com/advisories/GHSA-ggr8-5vv4-36mx).
Le problème nécessite des graphes d'objets cycliques, pas un simple JSON.

Prisma/client restent en 6.19.3 ; override limité à `@prisma/config` pour charger
`deepmerge-ts 8.0.2`, déjà utilisé par Assistant. Les changements majeurs v8
(Map et types) ont été relus ; le chargement de configuration et le scénario de
l'avis sont testés. Pas d'override global, de montée Prisma 7 ou de changement
du connecteur MongoDB. Retirer l'override quand la dépendance officielle sera
corrigée dans la version retenue.

Validation isolée : 3 tests `npm run test:prisma`, tests de sécurité existants
(images, quotas, accès privés/publics, chemins), lint, typecheck, build et
Prisma validate/generate. Les tests contrôlent les fichiers installés, pas le
seul cache npm, et chargent une configuration Prisma réelle. Aucun compte,
hash, session, fichier, URL publique ou règle isPublic n'est modifié.

Les traces serveur Next ne contiennent pas le paquet affecté, utilisé par la
CLI. Le client Prisma et le build actifs restent identiques ; installation du
seul paquet corrigé sans scripts, puis tests/audit/HTTP. Pas de redémarrage
PM2 nécessaire. Installation effectuée, tests physiques réussis : zéro vulnérabilité de production.

La sortie complète de Prisma vers MongoDB natif reste une évolution distincte,
notamment pour préserver l'adaptateur Better Auth et les comptes existants.

Sources : https://github.com/RebeccaStevens/deepmerge-ts/releases/tag/v8.0.0
