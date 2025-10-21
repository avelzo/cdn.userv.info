#!/bin/bash

# Script pour tester la connexion MongoDB

echo "🔍 Test de la configuration MongoDB..."

# Vérifier si MongoDB est accessible
echo "📡 Test de connexion à MongoDB..."
if command -v mongo &> /dev/null; then
    mongo --host 127.0.0.1:27017 --eval "db.adminCommand('ismaster')" --quiet
elif command -v mongosh &> /dev/null; then
    mongosh --host 127.0.0.1:27017 --eval "db.adminCommand('ismaster')" --quiet
else
    echo "❌ Ni mongo ni mongosh ne sont installés"
    echo "📋 Pour installer MongoDB:"
    echo "   - Ubuntu/Debian: sudo apt-get install mongodb"
    echo "   - ou installer MongoDB Community Edition depuis le site officiel"
fi

echo ""
echo "🏗️  Pour démarrer MongoDB (si pas encore démarré):"
echo "   sudo systemctl start mongodb"
echo "   # ou"
echo "   sudo service mongodb start"
echo ""
echo "🔑 Configuration des utilisateurs MongoDB:"
echo "   1. Connectez-vous en tant qu'admin: mongosh --port 27017"
echo "   2. Utilisez la base admin: use admin"
echo "   3. Créez l'admin: db.createUser({user:'mongoAdminUser', pwd:'mongoAdminPass2024', roles:['userAdminAnyDatabase']})"
echo "   4. Créez l'utilisateur: db.createUser({user:'userMongo001', pwd:'thisIsTheBestPassWD2024', roles:[{role:'readWrite', db:'cdn'}]})"