# AGENTS.md

## Portée

Ces consignes s'appliquent à tout le dépôt `cdn.userv.info`.

L'application utilise Next.js, Prisma avec MongoDB, Sharp et un stockage local sous
`uploads/users/{userId}`. Elle est destinée à un propriétaire administrateur unique,
mais le dernier audit local a trouvé **2 comptes** dans la base configurée. Ne jamais
supposer qu'un compte est supprimable ou inutilisé sans inventaire et accord explicite.

## Règles non négociables

- Ne supprimer ni compte, ni enregistrement Prisma, ni fichier existant sans accord
  explicite de l'utilisateur.
- Ne jamais modifier directement les données de production pendant un audit ou un test.
- Ne pas commiter, pousser, déployer, redémarrer un service de production ou recharger
  Nginx sans accord explicite.
- Préserver les modifications présentes dans le worktree et vérifier `git status` avant
  toute intervention.
- Lire `docs/SECURITY-HARDENING.md` avant de modifier l'authentification, les uploads,
  les routes de lecture ou le comportement de `isPublic`.
- Préserver les URL historiques du CDN tant que leurs consommateurs et leur statut
  public n'ont pas été inventoriés. Ne jamais rendre tous les fichiers publics pour
  résoudre un problème de compatibilité.
- Ne jamais journaliser mot de passe, cookie, session, token, URL signée complète,
  contenu de fichier ou corps de requête contenant des secrets.

## Authentification et autorisation

Une migration de NextAuth vers **Better Auth** est prévue. Pour tout nouveau travail :

- ne pas étendre l'intégration NextAuth au-delà d'un correctif indispensable ;
- isoler le code métier de la bibliothèque d'authentification ;
- utiliser une fonction serveur centrale qui retourne l'identifiant authentifié ou une
  réponse `401` cohérente ;
- déduire le propriétaire exclusivement de la session serveur ;
- ignorer ou rejeter tout `userId` provenant du navigateur, d'une URL, d'une query
  string ou d'un `FormData` ;
- rechercher fichiers et dossiers avec leur identifiant **et** l'identifiant du
  propriétaire dans la même requête Prisma ;
- répondre `404` pour une ressource absente ou appartenant à un autre utilisateur ;
- conserver l'inscription publique fermée (`/auth/signup` et `/api/auth/register`).

### Migration Better Auth

Avant la migration :

1. inventorier les comptes sans afficher d'informations personnelles ni modifier la
   base ;
2. identifier explicitement le compte administrateur à conserver ;
3. vérifier le format des hash de mots de passe actuels (`bcryptjs`) et la compatibilité
   avec Better Auth ;
4. préférer la réutilisation vérifiée des hash existants ; sinon prévoir une procédure
   de réinitialisation unique et sûre plutôt qu'une migration en clair ;
5. invalider proprement les anciennes sessions et anciens tokens de réinitialisation ;
6. tester la migration sur une copie isolée de la base avec au moins deux utilisateurs ;
7. prévoir un retour arrière documenté avant toute modification de production.

Ne jamais réécrire les mots de passe en masse, ne jamais les exporter en clair et ne
jamais supprimer le second compte simplement parce que l'application est censée être
mono-utilisateur. Toute consolidation vers un seul compte nécessite l'accord explicite
du propriétaire après inventaire des fichiers et dossiers associés.

## Fichiers et chemins

- La racine autorisée est `path.resolve(process.cwd(), "uploads")`.
- Construire les chemins uniquement depuis des données serveur validées.
- Valider les ObjectId MongoDB avant toute requête ou opération disque.
- Utiliser `path.resolve`/`realpath` et exiger que la cible reste sous la racine suivie
  de `path.sep` avant `readFile`, `writeFile`, `rename`, `unlink` ou test d'existence.
- Refuser `..`, chemins absolus, séparateurs bruts ou encodés, octets nuls et symlinks.
- Ne jamais parcourir les dossiers utilisateurs pour retrouver un fichier par son nom.
- Maintenir la cohérence base/disque avec fichiers temporaires, renommage atomique et
  compensation en cas d'échec partiel.
- Une suppression doit vérifier la propriété, mettre en sécurité original et
  miniatures, puis supprimer l'enregistrement de façon compensable.

## Uploads

- Taille par défaut : 10 Mo maximum, complétée par `client_max_body_size 11m` dans
  Nginx.
- Formats autorisés pour les nouveaux uploads : JPEG, PNG et WebP seulement.
- Ne pas réautoriser SVG, HTML, JavaScript, XML, JSON, archives, exécutables, polices,
  fichiers inconnus ou doubles extensions sans besoin validé.
- Ne faire confiance ni au MIME déclaré ni à l'extension : décoder avec Sharp,
  contrôler format/dimensions/pixels, puis réencoder sans EXIF/GPS.
- Générer le nom physique côté serveur.
- Conserver quotas total et journalier, rate limiting et limite de concurrence.
- Toute évolution multipart doit préserver la limite avant mise en mémoire ; Nginx est
  obligatoire tant que `request.formData()` est utilisé.

## Fichiers publics et privés

- `isPublic=true` autorise la lecture publique ; un fichier privé exige la session de
  son propriétaire.
- Les accès refusés retournent `404` et `Cache-Control: private, no-store` s'applique
  aux réponses privées.
- Les exceptions historiques sont explicites via
  `CDN_LEGACY_PUBLIC_FILE_IDS`, `CDN_LEGACY_PUBLIC_PATHS` ou, exceptionnellement,
  `CDN_LEGACY_PUBLIC_USER_IDS`.
- Toute nouvelle exception doit être documentée, minimale et assortie d'un plan de
  retrait.
- Conserver `X-Content-Type-Options: nosniff`, la CSP de téléchargement et un MIME
  déterminé côté serveur.

## Rate limiting et infrastructure

Le rate limiter actuel est en mémoire et ne convient qu'à une instance. En cas de
multi-instance, utiliser un stockage partagé avec opérations atomiques, par exemple
Redis. Faire confiance à `X-Forwarded-For` uniquement lorsque Nginx le remplace depuis
un proxy maîtrisé.

Ne pas assouplir la validation TLS SMTP par défaut. Si un certificat auto-signé est
indispensable, documenter et limiter explicitement l'exception.

## Tests et validation

Utiliser une base de test isolée pour tout scénario créant, modifiant ou supprimant des
données. Ne jamais lancer ces scénarios contre la base configurée en production.

Avant livraison, exécuter :

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm audit --omit=dev
git diff --check
```

Couvrir au minimum : absence de session (`401`), deux utilisateurs et accès croisés
(`404`), `userId` falsifié, inscription fermée, JPEG/PNG/WebP valides, faux MIME,
HTML renommé, SVG, taille/pixels/quota, traversal brut et encodé, rate limiting,
lecture publique/privée et compensations upload/suppression.

Ne pas appliquer `npm audit fix` ou une mise à jour majeure automatiquement. Présenter
les vulnérabilités, versions cibles, risques de régression et résultats des tests avant
de demander l'accord pour une mise à jour sensible.
