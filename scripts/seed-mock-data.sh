#!/bin/bash

echo "🎯 Ajout des données mockées pour CDN UserV..."

# Récupération de l'ID de l'utilisateur test (juste l'ID sans ObjectId wrapper)
USER_ID=$(mongosh cdn --quiet --eval "print(db.users.findOne({username: 'testuser'})._id.toString())")

echo "👤 Utilisateur trouvé avec ID: $USER_ID"

# Insertion des dossiers mockés
mongosh cdn --eval "
const userId = '$USER_ID';

// Création du dossier racine
const rootFolder = db.folders.insertOne({
  name: 'Racine',
  slug: 'root',
  path: '/',
  parentId: null,
  isRoot: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  userId: ObjectId(userId)
});

console.log('📁 Dossier racine créé:', rootFolder.insertedId);

// Création des sous-dossiers
const imagesFolder = db.folders.insertOne({
  name: 'Images',
  slug: 'images',
  path: '/images',
  parentId: rootFolder.insertedId,
  isRoot: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  userId: ObjectId(userId)
});

const videosFolder = db.folders.insertOne({
  name: 'Vidéos',
  slug: 'videos',
  path: '/videos',
  parentId: rootFolder.insertedId,
  isRoot: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  userId: ObjectId(userId)
});

const documentsFolder = db.folders.insertOne({
  name: 'Documents',
  slug: 'documents',
  path: '/documents',
  parentId: rootFolder.insertedId,
  isRoot: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  userId: ObjectId(userId)
});

// Sous-dossiers d'images
const photosFolder = db.folders.insertOne({
  name: 'Photos',
  slug: 'photos',
  path: '/images/photos',
  parentId: imagesFolder.insertedId,
  isRoot: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  userId: ObjectId(userId)
});

const iconsFolder = db.folders.insertOne({
  name: 'Icônes',
  slug: 'icons',
  path: '/images/icons',
  parentId: imagesFolder.insertedId,
  isRoot: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  userId: ObjectId(userId)
});

console.log('📂 Dossiers créés:');
console.log('  - Images:', imagesFolder.insertedId);
console.log('  - Vidéos:', videosFolder.insertedId);
console.log('  - Documents:', documentsFolder.insertedId);
console.log('  - Photos:', photosFolder.insertedId);
console.log('  - Icônes:', iconsFolder.insertedId);

// Ajout de quelques fichiers mockés
const file1 = db.files.insertOne({
  name: '1729456789-sample-photo.jpg',
  originalName: 'sample-photo.jpg',
  slug: 'sample-photo',
  mimeType: 'image/jpeg',
  size: 2048000,
  path: '/images/photos/1729456789-sample-photo.jpg',
  url: 'https://cdn.userv.info/images/photos/1729456789-sample-photo.jpg',
  checksum: 'abc123def456',
  isPublic: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  userId: ObjectId(userId),
  folderId: photosFolder.insertedId
});

const file2 = db.files.insertOne({
  name: '1729456790-document.pdf',
  originalName: 'document.pdf',
  slug: 'document',
  mimeType: 'application/pdf',
  size: 1024000,
  path: '/documents/1729456790-document.pdf',
  url: 'https://cdn.userv.info/documents/1729456790-document.pdf',
  checksum: 'def456ghi789',
  isPublic: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  userId: ObjectId(userId),
  folderId: documentsFolder.insertedId
});

console.log('📄 Fichiers mockés créés:');
console.log('  - Photo:', file1.insertedId);
console.log('  - Document:', file2.insertedId);
"

echo "✅ Données mockées ajoutées avec succès !"
echo "📊 Structure créée :"
echo "   📁 Racine /"
echo "   ├── 📁 Images /images"
echo "   │   ├── 📁 Photos /images/photos"
echo "   │   │   └── 📄 sample-photo.jpg"
echo "   │   └── 📁 Icônes /images/icons"
echo "   ├── 📁 Vidéos /videos"
echo "   └── 📁 Documents /documents"
echo "       └── 📄 document.pdf"