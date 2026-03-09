

# Masquer les filtres de recherche par défaut au clic sur la barre de recherche

## Problème
Lorsque l'utilisateur clique sur la barre de recherche (focus sur l'input), les préfixes/filtres s'affichent automatiquement. L'utilisateur souhaite qu'ils ne s'affichent jamais par défaut.

## Changement

**Fichier : `src/components/modals/GlobalSearchModal.tsx`**

- **Supprimer le `onFocus`** (ligne 437) qui déclenche `setShowPrefixSuggestions(true)` quand le champ est vide.
- Les filtres ne s'afficheront que lorsque l'utilisateur tape un préfixe de recherche valide (comportement déjà géré par `handleInputChange`).

