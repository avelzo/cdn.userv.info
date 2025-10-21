# 🐛 Résolution du problème de caractères accentués

## Problème rencontré
```
{
  success: false,
  error: "Le nom du dossier contient des caractères non autorisés"
}
```

## Cause racine
La validation dans les entités du domaine utilisait une regex trop restrictive qui ne permettait pas les caractères accentués français comme "é", "è", "ô", etc.

### Code problématique
```typescript
// ❌ Ancienne regex trop restrictive
if (!/^[a-zA-Z0-9\s\-_\.]+$/.test(name)) {
  throw new Error('Le nom du dossier contient des caractères non autorisés');
}
```

## Solution appliquée

### ✅ Mise à jour des entités du domaine

1. **Folder.ts** - Validation mise à jour :
```typescript
// ✅ Nouvelle regex supportant Unicode
if (!/^[\p{L}\p{N}\s\-_.]+$/u.test(name)) {
  throw new Error('Le nom du dossier contient des caractères non autorisés');
}
```

2. **File.ts** - Validation simplifiée pour les fichiers
3. **User.ts** - Validation Unicode pour les usernames

### 🎯 Avantages de la nouvelle approche

- **\p{L}** : Toutes les lettres Unicode (incluant les accents)
- **\p{N}** : Tous les chiffres Unicode
- **Flag 'u'** : Active le support Unicode complet
- Support des caractères français : é, è, à, ç, ô, etc.

## Test de validation

```bash
# ✅ L'API fonctionne maintenant
curl "http://localhost:3000/api/folders?userId=68f6914dfac6d73b4751e944"

# Résultat : 7 dossiers chargés incluant "Vidéos" et "Icônes"
```

## Dossiers supportés après correction
- ✅ "Racine"
- ✅ "Images" 
- ✅ "Vidéos" (avec accent)
- ✅ "Documents"
- ✅ "Photos"
- ✅ "Icônes" (avec accent circonflexe)

Cette correction respecte les principes DDD en gardant la validation dans les entités du domaine tout en étant plus inclusive pour les caractères internationaux.