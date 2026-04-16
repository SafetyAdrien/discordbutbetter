
# Correctif d'alignement des Tabs (Connexion/Inscription)

## Problème identifié

Le `TabsList` utilise actuellement `grid grid-cols-2` pour afficher les deux boutons "Connexion" et "Inscription". Cette approche peut causer des problèmes d'alignement et d'espacement, surtout si les textes ont des longueurs différentes.

## Solution

Modifier `src/components/ui/tabs.tsx` pour utiliser un layout flex avec `flex-1` sur les `TabsTrigger`, garantissant un alignement et une distribution parfaite de l'espace.

### Changements dans `src/components/ui/tabs.tsx`

**TabsList** (ligne 15) :
- Remplacer `inline-flex` par `flex` 
- Ajouter `w-full` pour occuper toute la largeur

**TabsTrigger** (ligne 30) :
- Ajouter `flex-1` pour que chaque bouton occupe un espace égal
- Assurer que le texte est parfaitement centré

### Changements dans `src/pages/Auth.tsx`

**TabsList** (ligne 690) :
- Retirer `grid w-full grid-cols-2` (déjà géré par le composant)
- Simplifier en `w-full`

## Fichier modifié
- `src/components/ui/tabs.tsx`
- `src/pages/Auth.tsx`
