#!/bin/bash

echo "🚀 Configuration de MongoDB pour CDN UserV..."

# Configuration de la base de données CDN directement
mongosh cdn --eval "
// Création d'un utilisateur admin pour la base cdn
db.createUser({
  user: 'mongoAdminUser',
  pwd: 'mongoAdminPass2024',
  roles: [
    { role: 'readWrite', db: 'cdn' },
    { role: 'dbAdmin', db: 'cdn' }
  ]
});

console.log('✅ Utilisateur admin créé');
" 2>/dev/null || echo "Utilisateur admin existe déjà"

mongosh cdn --eval "
// Création de l'utilisateur principal
db.createUser({
  user: 'userMongo001',
  pwd: 'thisIsTheBestPassWD2024',
  roles: [
    { role: 'readWrite', db: 'cdn' }
  ]
});

console.log('✅ Utilisateur principal créé');
" 2>/dev/null || echo "Utilisateur principal existe déjà"

mongosh cdn --eval "
// Insertion d'un utilisateur de test
const testUser = db.users.insertOne({
  email: 'test@userv.info',
  username: 'testuser',
  createdAt: new Date(),
  updatedAt: new Date()
});

console.log('✅ Utilisateur test inséré avec ID:', testUser.insertedId);
"

echo "🎯 Configuration terminée !"
echo "📋 Base de données: cdn"
echo "👤 Utilisateurs créés:"
echo "   - mongoAdminUser (admin)"
echo "   - userMongo001 (readWrite)"
echo "   - Utilisateur test inséré"
echo "📝 Vous pouvez maintenant utiliser: npx prisma db push"