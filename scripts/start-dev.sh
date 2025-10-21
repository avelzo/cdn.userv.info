#!/bin/bash

echo "🚀 Démarrage du CDN UserV..."
echo ""

# Vérification de MongoDB
echo "🔍 Vérification de MongoDB..."
if mongosh --quiet --eval "db.adminCommand('ismaster')" > /dev/null 2>&1; then
    echo "✅ MongoDB connecté"
else
    echo "❌ MongoDB non disponible"
    echo "💡 Démarrez MongoDB avec: sudo systemctl start mongodb"
    exit 1
fi

# Vérification des données
USER_COUNT=$(mongosh cdn --quiet --eval "print(db.users.countDocuments())")
FOLDER_COUNT=$(mongosh cdn --quiet --eval "print(db.folders.countDocuments())")

echo "📊 Base de données CDN:"
echo "   👤 Utilisateurs: $USER_COUNT"
echo "   📁 Dossiers: $FOLDER_COUNT"
echo ""

if [ "$USER_COUNT" = "0" ]; then
    echo "⚠️  Aucune donnée trouvée. Exécutez les scripts de configuration:"
    echo "   ./scripts/setup-mongodb.sh"
    echo "   ./scripts/seed-mock-data.sh"
    echo ""
fi

echo "🌐 Démarrage du serveur Next.js..."
echo "   Accès: http://localhost:3001"
echo "   API Test: http://localhost:3001/api/folders?userId=68f6914dfac6d73b4751e944"
echo "   Manager: http://localhost:3001/manager"
echo ""

npm run dev