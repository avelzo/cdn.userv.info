#!/bin/bash

echo "🧪 Test de l'API Folders avec les données MongoDB..."

# Récupération de l'ID de l'utilisateur test de MongoDB
USER_ID=$(mongosh cdn --quiet --eval "print(db.users.findOne({username: 'testuser'})._id.toString())")

echo "👤 Test avec l'utilisateur ID: $USER_ID"
echo ""

# Test GET - Récupération des dossiers
echo "📁 GET /api/folders?userId=$USER_ID"
curl -s "http://localhost:3001/api/folders?userId=$USER_ID" | jq '.'

echo ""
echo "✅ Test terminé !"
echo ""
echo "🌐 Vous pouvez aussi tester dans le navigateur:"
echo "   http://localhost:3001/api/folders?userId=$USER_ID"