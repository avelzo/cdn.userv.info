#!/bin/bash

echo "🚀 Test rapide de l'application CDN UserV"
echo ""

# Vérifier si le serveur Next.js tourne
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Serveur Next.js détecté sur le port 3000"
    
    echo ""
    echo "🧪 Test de l'API..."
    echo "GET /api/folders?userId=68f6914dfac6d73b4751e944"
    RESPONSE=$(curl -s "http://localhost:3000/api/folders?userId=68f6914dfac6d73b4751e944")
    
    if echo "$RESPONSE" | grep -q '"success":true'; then
        echo "✅ API fonctionne correctement"
        FOLDER_COUNT=$(echo "$RESPONSE" | grep -o '"name":"[^"]*"' | wc -l)
        echo "📁 $FOLDER_COUNT dossiers trouvés"
    else
        echo "❌ Erreur API:"
        echo "$RESPONSE"
    fi
    
    echo ""
    echo "🌐 URLs de test:"
    echo "   Application: http://localhost:3000"
    echo "   Gestionnaire: http://localhost:3000/manager"
    echo "   API: http://localhost:3000/api/folders?userId=68f6914dfac6d73b4751e944"
    
else
    echo "❌ Serveur Next.js non détecté"
    echo "💡 Démarrez avec: npm run dev"
    echo ""
    
    # Vérifier MongoDB
    if mongosh --quiet --eval "db.adminCommand('ismaster')" > /dev/null 2>&1; then
        echo "✅ MongoDB connecté"
        USER_COUNT=$(mongosh cdn --quiet --eval "print(db.users.countDocuments())")
        echo "📊 $USER_COUNT utilisateurs en base"
    else
        echo "❌ MongoDB non disponible"
    fi
fi