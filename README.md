# CDN UserV - Gestionnaire de Médias

Une solution CDN moderne et performante construite avec Next.js, TypeScript et Prisma, suivant les principes du Domain-Driven Design (DDD).

## 🚀 Fonctionnalités

- **📁 Gestion hiérarchique des dossiers** - Organisation intuitive avec structure parent/enfant
- **📤 Upload de fichiers** - Glisser-déposer et sélection multiple
- **🖼️ Génération automatique de miniatures** - Aperçus optimisés pour les images
- **🔗 URLs permanentes** - Liens stables et partageables
- **🗃️ Base de données MongoDB** - Stockage NoSQL avec Prisma ORM
- **🎨 Interface moderne** - Design responsive avec Tailwind CSS
- **🏗️ Architecture DDD** - Code maintenable et évolutif

## 🛠️ Technologies

- **Frontend** : Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend** : Next.js API Routes, Prisma ORM
- **Base de données** : MongoDB
- **Traitement d'images** : Sharp
- **Linting** : ESLint

## 📋 Prérequis

- Node.js 18+ 
- MongoDB (local ou distant)
- npm/yarn/pnpm

## 🚀 Installation

1. **Cloner le repository**
```bash
git clone https://github.com/avelzo/cdn.userv.info.git
cd cdn.userv.info
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configuration de l'environnement**
```bash
cp .env.example .env.local
```

Configurer les variables d'environnement :
```env
DATABASE_URL="mongodb://username:password@localhost:27017/cdn"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

4. **Configuration de la base de données**
```bash
# Générer le client Prisma
npx prisma generate

# Synchroniser le schéma
npx prisma db push

# (Optionnel) Interface d'administration
npx prisma studio
```

5. **Démarrer l'application**
```bash
npm run dev
```

L'application sera accessible sur [http://localhost:3000](http://localhost:3000)

## 📁 Structure du projet

```
├── app/                    # Pages et API Routes Next.js
│   ├── api/               # Endpoints API
│   │   ├── files/         # Gestion des fichiers
│   │   ├── folders/       # Gestion des dossiers
│   │   └── uploads/       # Serveur de fichiers statiques
│   ├── manager/           # Interface de gestion
│   └── uploads/           # Routes de téléchargement
├── src/                   # Architecture DDD
│   ├── domain/            # Entités et règles métier
│   ├── application/       # Cas d'usage
│   └── infrastructure/    # Implémentations techniques
├── prisma/                # Schéma et migrations
├── public/                # Assets statiques
└── uploads/               # Stockage des fichiers
```

## 🔧 API Endpoints

### Gestion des dossiers
- `GET /api/folders?userId={id}` - Liste des dossiers
- `POST /api/folders` - Créer un dossier
- `DELETE /api/folders/{id}` - Supprimer un dossier

### Gestion des fichiers
- `GET /api/files?folderId={id}&userId={id}` - Liste des fichiers
- `POST /api/files/upload` - Upload de fichier
- `DELETE /api/files/{id}` - Supprimer un fichier

### Accès aux fichiers
- `GET /api/uploads/users/{userId}/files/{fileId}` - Fichier original
- `GET /api/uploads/users/{userId}/thumbs/{fileId}-{size}.jpg` - Miniature

## 🎯 Utilisation

### Interface de gestion
Accédez à `/manager` pour une interface complète de gestion des médias avec :
- Navigation dans l'arborescence des dossiers
- Upload par glisser-déposer
- Aperçu et détails des fichiers
- Actions de copie, téléchargement et suppression

### Intégration API
```javascript
// Upload d'un fichier
const formData = new FormData();
formData.append('file', file);
formData.append('folderId', folderId);
formData.append('userId', userId);
formData.append('isPublic', 'true');

const response = await fetch('/api/files/upload', {
  method: 'POST',
  body: formData
});
```

## 🏗️ Architecture DDD

Le projet suit les principes du Domain-Driven Design :

- **Domain Layer** : Entités métier (`User`, `Folder`, `File`) et services
- **Application Layer** : Cas d'usage et orchestration
- **Infrastructure Layer** : Repositories Prisma et accès aux données

Voir [docs/DDD-ARCHITECTURE.md](docs/DDD-ARCHITECTURE.md) pour plus de détails.

## 🧪 Données de test

Un utilisateur de test est disponible :
- **Email** : test@userv.info
- **Username** : testuser  
- **ID** : 68f6914dfac6d73b4751e944

## 📝 Scripts disponibles

```bash
npm run dev          # Démarrage en mode développement (avec Turbopack)
npm run build        # Build de production
npm run start        # Démarrage en mode production
npm run lint         # Vérification du code
```

## 🐛 Debugging

- Logs détaillés dans la console du navigateur
- Interface Prisma Studio : `npx prisma studio`
- Vérification des uploads dans le dossier `uploads/`

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/amazing-feature`)
3. Commit les changements (`git commit -m 'Add amazing feature'`)
4. Push vers la branche (`git push origin feature/amazing-feature`)
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 🔗 Liens utiles

- [Documentation Next.js](https://nextjs.org/docs)
- [Documentation Prisma](https://www.prisma.io/docs)
- [Documentation MongoDB](https://docs.mongodb.com/)
- [Documentation Tailwind CSS](https://tailwindcss.com/docs)
