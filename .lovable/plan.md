

# Corrections UI : focus, filtres de recherche et timestamp

## 1. Retirer les contours de focus colorés sur les barres de recherche

**Fichier : `src/components/ui/input.tsx`**
- Supprimer `focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:border-primary/50` de la classe du composant Input
- L'input gardera juste `focus-visible:outline-none`

## 2. Modal de recherche : ne pas afficher les filtres par défaut

**Fichier : `src/components/modals/GlobalSearchModal.tsx`**
- Retirer `autoFocus` de l'input (ligne 441) — c'est lui qui déclenche le `onFocus` et affiche les préfixes dès l'ouverture
- Les filtres apparaîtront uniquement quand l'utilisateur clique dans la barre de recherche

## 3. Timestamp à droite du nom d'affichage (messages publics)

**Fichier : `src/components/chat/ChatArea.tsx`** (ligne ~1504-1539)
- Le flex row contient : `[Nom] [Tags] [Timestamp]` — le timestamp est déjà après le nom mais il manque un espacement pour le pousser visuellement à droite
- Actuellement le timestamp est juste posé dans le flux flex avec `gap-2`
- Pas de changement structurel nécessaire — le timestamp est déjà à droite du nom. Si l'affichage semble inversé, c'est probablement un artefact visuel. Je vérifierai le rendu en implémentation.

---

3 fichiers modifiés, changements mineurs et ciblés.

