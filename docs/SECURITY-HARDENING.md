# Durcissement de cdn.userv.info

## Inventaire préalable (3 août 2026)

L'inventaire en lecture seule de la base configurée localement a trouvé 2 utilisateurs,
4 dossiers et 13 fichiers. Les 13 fichiers ont `isPublic=false`; aucun n'a
`isPublic=true`. Le disque local contient 20 originaux sous deux dossiers utilisateur,
ainsi que leurs miniatures. Il existe donc des fichiers physiques sans enregistrement
dans la base interrogée.

Les URL historiques `/uploads/users/{userId}/files/{fileId}.{ext}` sont référencées
dans les dépôts voisins `userv.info`, `news.userv.info`, `4creation`,
`inventory.userv.info` et `billing.userv.info`. Certains identifiants référencés ne
sont présents ni dans cette base ni dans le snapshot local. Il faut refaire cet
inventaire sur l'hôte de production avant activation du nouveau contrôle de lecture.

## Migration des anciennes URL

Par défaut, un fichier privé n'est accessible qu'à son propriétaire authentifié. Un
fichier public conserve la même URL historique. Les exceptions temporaires sont des
listes séparées par des virgules :

- `CDN_LEGACY_PUBLIC_FILE_IDS`: exceptions par identifiant de fichier (préféré) ;
- `CDN_LEGACY_PUBLIC_PATHS`: exceptions par chemin exact, y compris pour un fichier
  physique sans enregistrement ;
- `CDN_LEGACY_PUBLIC_USER_IDS`: exception large par propriétaire, à réserver à une
  migration courte.

Exemple :

```dotenv
CDN_LEGACY_PUBLIC_FILE_IDS=690385f534046dbc0b123356,6903878ed21556f779fb4dd2
CDN_LEGACY_PUBLIC_PATHS=/uploads/users/USER/files/FILE.webp
```

Le propriétaire a explicitement validé le 4 août 2026 la publication des 13 fichiers
actuellement inventoriés. Cette décision ne couvre pas les 7 originaux physiques sans
enregistrement : ils ne doivent être ni exposés par une recherche disque, ni supprimés.
La migration est détaillée plus bas et reste une commande explicite après le pull.

## Variables de sécurité

| Variable | Défaut | Rôle |
| --- | ---: | --- |
| `UPLOAD_MAX_BYTES` | `10485760` | Taille maximale d'un fichier et de sa version normalisée |
| `UPLOAD_MAX_WIDTH` | `12000` | Largeur maximale |
| `UPLOAD_MAX_HEIGHT` | `12000` | Hauteur maximale |
| `UPLOAD_MAX_PIXELS` | `40000000` | Nombre maximal de pixels |
| `UPLOAD_TOTAL_QUOTA_BYTES` | `1073741824` | Quota total par utilisateur |
| `UPLOAD_DAILY_QUOTA_BYTES` | `104857600` | Quota glissant sur 24 heures |
| `UPLOAD_RATE_LIMIT` | `30` | Uploads par heure et couple utilisateur/IP |
| `UPLOAD_MAX_CONCURRENT` | `2` | Traitements Sharp simultanés par processus |
| `AUTH_CAPTCHA_REQUIRED` | `false` | Refuse de démarrer si Turnstile est exigé mais incomplet |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | vide | Clé publique du widget Turnstile |
| `TURNSTILE_SECRET` | vide | Secret de validation Turnstile, serveur uniquement |
| `TURNSTILE_ALLOWED_HOSTNAMES` | dérivé de `BETTER_AUTH_URL` | Hôtes autorisés dans les jetons |
| `SMTP_TLS_REJECT_UNAUTHORIZED` | `true` | Mettre explicitement `false` uniquement pour un certificat SMTP auto-signé maîtrisé |

Le rate limiting applicatif est en mémoire. Si plusieurs processus ou instances sont
utilisés, le remplacer par Redis (clé partagée et expiration atomique).

## Nginx recommandé

Le dépôt ne contenait aucune limite Nginx. Point de départ à adapter :

```nginx
limit_req_zone $binary_remote_addr zone=cdn_login:10m rate=10r/m;
limit_req_zone $binary_remote_addr zone=cdn_upload:10m rate=10r/m;
limit_conn_zone $binary_remote_addr zone=cdn_conn:10m;

server {
    server_tokens off;
    client_max_body_size 11m;
    client_body_timeout 15s;

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;

    add_header Strict-Transport-Security "max-age=31536000" always;

    location = /api/auth/sign-in/email {
        limit_req zone=cdn_login burst=5 nodelay;
        proxy_pass http://127.0.0.1:3010;
    }

    location = /api/files/upload {
        limit_req zone=cdn_upload burst=3 nodelay;
        limit_conn cdn_conn 2;
        proxy_request_buffering on;
        proxy_pass http://127.0.0.1:3010;
    }
}
```

Nginx doit remplacer, et non concaténer, les en-têtes `X-Forwarded-For` provenant du
client public. Le code suppose que le premier élément est injecté par un proxy de
confiance.

L'installation annoncée utilise une seule instance Node derrière Nginx. Le rate limiter
en mémoire est donc acceptable à ce stade. Une seconde instance ou un second processus
PM2 imposera un stockage partagé atomique, par exemple Redis.

## Déploiement (à exécuter uniquement après accord)

### Dépendances à valider avant production

Nodemailer a été mis à jour explicitement vers 9.0.4 après vérification de l'adaptateur
SMTP utilisé par Better Auth. Aucun `npm audit fix --force` n'a été appliqué et
`npm audit --omit=dev` ne signale plus de vulnérabilité connue.

ESLint a été aligné sur `9.39.1`, déjà enregistré dans `package-lock.json`, car
ESLint 10.6.0 était incompatible avec le plugin React fourni par
`eslint-config-next` 16.2.9 et empêchait tout lint.

```bash
npm ci
npx prisma generate
npm run typecheck
npm test
npm run lint
npm run build
sudo nginx -t
sudo systemctl reload nginx
sudo systemctl restart cdn.userv.info
```

### Migration Better Auth

Better Auth utilise les collections dédiées `better_auth_accounts`,
`better_auth_sessions` et `better_auth_verifications`. Les anciennes collections
NextAuth ne sont ni modifiées ni supprimées. Les hash bcrypt historiques restent dans
`users.password` pour permettre un retour arrière et sont copiés tels quels dans le
compte Better Auth `credential`.

Avant toute écriture, exécuter l'inventaire en lecture seule :

```bash
npm run auth:inventory
```

La migration avec `--apply` est volontairement protégée et ne doit être exécutée que
sur une copie isolée, puis en production après validation explicite :

```bash
BETTER_AUTH_EXPECTED_USER_COUNT=nombre_affiché \
BETTER_AUTH_MIGRATION_CONFIRM=MIGRATE_ALL_EXISTING_USERS \
  npm run auth:inventory -- --apply
```

Elle refuse les hash non bcrypt et les utilisateurs sans nom. Elle migre tous les
comptes inventoriés, refuse si le nombre a changé entre inventaire et écriture, sans
décider lequel est administrateur et sans consolidation.
Configurer `BETTER_AUTH_SECRET` (au moins 32 caractères à forte entropie) et
`BETTER_AUTH_URL`; `NEXTAUTH_SECRET` et `NEXTAUTH_URL` ne sont que des fallbacks de
transition.

Retour arrière : remettre la version applicative précédente. Les anciennes sessions
et tables sont conservées, et chaque changement de mot de passe Better Auth synchronise
le hash de retour arrière dans `users.password`. Les nouveaux tokens de réinitialisation
Better Auth ne fonctionneront pas après retour arrière ; il faudra en demander un
nouveau avec l'ancienne version.

### Protection anti-robot

L'inscription reste fermée dans Better Auth, dans la route historique et dans l'UI.
Elle ne doit pas être rouverte simplement en ajoutant un CAPTCHA. Le login utilise le
plugin Turnstile officiel de Better Auth, avec validation serveur, action `login` et
contrôle du hostname. Le honeypot ne protège que contre les robots naïfs ; Turnstile,
les limites Better Auth et les limites Nginx restent les contrôles déterminants.

Créer un widget Turnstile limité à `cdn.userv.info`, puis configurer :

```dotenv
AUTH_CAPTCHA_REQUIRED=true
NEXT_PUBLIC_TURNSTILE_SITE_KEY=clé_publique
TURNSTILE_SECRET=secret_serveur
TURNSTILE_ALLOWED_HOSTNAMES=cdn.userv.info
```

Utiliser des clés distinctes en développement et en production. Le secret ne doit
jamais être placé dans une variable `NEXT_PUBLIC_*`.

### Publication des fichiers existants

La commande est en lecture seule par défaut :

```bash
npm run media:publish-existing
```

Après snapshot de la base et vérification du nombre attendu, publier les fichiers
enregistrés :

```bash
MEDIA_PUBLICATION_CONFIRM=PUBLISH_ALL_EXISTING_FILES \
MEDIA_EXPECTED_PRIVATE_COUNT=13 \
  npm run media:publish-existing -- --apply
```

Relancer ensuite la commande sans `--apply` et vérifier `privateFiles=0`. Les nouveaux
uploads sont publics par défaut et utilisent l'URL canonique
`/uploads/users/{userId}/files/{fileId}.{extension}`.

Le manager permet ensuite de rendre une image publique ou privée, seule ou par lot de
100 maximum. Toutes les ressources de la sélection sont vérifiées avec l'identifiant
du propriétaire avant la mise à jour. Comme la visibilité peut être révoquée, les
réponses publiques utilisent un cache court (`max-age=60, must-revalidate`) et non plus
un cache annuel `immutable`.

## Contrôles après déploiement

1. Vérifier que `/auth/signup`, `/api/auth/register` et
   `/api/auth/sign-up/email` répondent 404.
2. Vérifier les 401 sans cookie sur fichiers, dossiers et upload.
3. Vérifier avec deux comptes de test isolés que les ressources croisées répondent 404.
4. Tester JPEG, PNG et WebP, ainsi que HTML renommé, SVG, double extension, dépassement
   de taille et dépassement de pixels.
5. Vérifier qu'un fichier privé renvoie 404 publiquement et `private, no-store` à son
   propriétaire; vérifier qu'un fichier public renvoie un cache public.
6. Tester chaque URL historique allowlistée depuis ses sites consommateurs.
7. Vérifier les originaux et les deux miniatures après upload et suppression.
8. Surveiller les événements JSON `upload_rejected`, `cross_user_file_access_rejected`,
   `path_traversal_rejected`, `upload_quota_exceeded` et `file_delete_cleanup_pending`.
