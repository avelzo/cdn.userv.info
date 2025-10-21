# CDN UserV - Architecture DDD

## 🏗️ Architecture Domain-Driven Design

Cette application suit les principes du Domain-Driven Design (DDD) avec une séparation claire des responsabilités.

### 📁 Structure du projet

```
src/
├── domain/                 # Couche Domaine (règles métier)
│   ├── entities/          # Entités métier
│   │   ├── User.ts
│   │   ├── Folder.ts
│   │   └── File.ts
│   ├── repositories/      # Interfaces des repositories
│   │   ├── UserRepository.ts
│   │   ├── FolderRepository.ts
│   │   └── FileRepository.ts
│   └── services/          # Services du domaine
│       ├── FolderService.ts
│       └── FileService.ts
├── application/           # Couche Application (cas d'usage)
│   └── use-cases/
│       └── MediaManagerUseCase.ts
└── infrastructure/        # Couche Infrastructure (détails techniques)
    ├── database/
    │   └── prisma.ts
    └── repositories/      # Implémentations concrètes
        ├── PrismaFolderRepository.ts
        └── PrismaFileRepository.ts
```

### 🎯 Couches DDD

#### 🏛️ Domaine (Domain Layer)
- **Entités** : `User`, `Folder`, `File` avec leurs règles métier
- **Services du domaine** : Logique métier complexe
- **Interfaces des repositories** : Contrats pour l'accès aux données

#### 🎮 Application (Application Layer)  
- **Cas d'usage** : Orchestration des opérations métier
- **Commands** : Objets de transfert de données

#### 🔧 Infrastructure (Infrastructure Layer)
- **Repositories Prisma** : Implémentations concrètes avec MongoDB
- **Configuration base de données** : Connexion Prisma

### 🗄️ Base de données MongoDB

#### Configuration
```env
DATABASE_HOST=127.0.0.1
DATABASE_NAME=cdn
DATABASE_PORT=27017
DATABASE_USER="userMongo001"
DATABASE_USERPASS="thisIsTheBestPassWD2024"
DATABASE_ADMIN="mongoAdminUser" 
DATABASE_ADMINPASS="mongoAdminPass2024"
```

#### Modèles Prisma
- **User** : Utilisateurs du système
- **Folder** : Dossiers hiérarchiques avec relations parent/enfant
- **File** : Fichiers avec métadonnées
- **FileMetadata** : Métadonnées étendues (dimensions, durée, etc.)

### 🚀 Démarrage rapide

#### 1. Configuration MongoDB
```bash
# Configuration initiale (une seule fois)
./scripts/setup-mongodb.sh
./scripts/seed-mock-data.sh

# Push du schéma Prisma
npx prisma db push
```

#### 2. Démarrage de l'application
```bash
# Script tout-en-un
./scripts/start-dev.sh

# Ou manuellement
npm run dev
```

#### 3. Accès aux services
- **Application** : http://localhost:3001
- **Gestionnaire** : http://localhost:3001/manager  
- **API Test** : http://localhost:3001/api/folders?userId=68f6914dfac6d73b4751e944

### 📊 Données mockées

**Utilisateur de test** :
- Email: test@userv.info
- Username: testuser
- ID: 68f6914dfac6d73b4751e944

**Structure des dossiers** :
```
📁 Racine /
├── 📁 Images /images
│   ├── 📁 Photos /images/photos
│   │   └── 📄 sample-photo.jpg
│   └── 📁 Icônes /images/icons
├── 📁 Vidéos /videos
└── 📁 Documents /documents
    └── 📄 document.pdf
```

### 🛠️ Commandes Prisma

```bash
# Génération du client
npx prisma generate

# Migration de la base de données (dev)
npx prisma db push

# Interface d'administration
npx prisma studio
```

### ✨ Avantages de cette architecture

1. **Séparation des préoccupations** : Chaque couche a sa responsabilité
2. **Testabilité** : Injection de dépendances et interfaces
3. **Maintenabilité** : Code organisé et évolutif
4. **Règles métier centralisées** : Dans les entités et services du domaine
5. **Flexibilité** : Changement d'ORM ou de base de données facilité