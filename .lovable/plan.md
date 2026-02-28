

# Resserrer le panneau de statut contre le panneau de profil

## Changement

Modifier la valeur du gap dans `src/components/profile/UserProfileCard.tsx` :

- **Ligne 87** : Changer `popoverRect.right + 4` en `popoverRect.right + 1` pour que le menu de statut soit quasiment collé au panneau de profil (1px de marge au lieu de 4px).

- **Ligne ~199** (le bridge invisible) : Réduire la largeur du bridge de `w-3` (12px) à `w-1` (4px) et ajuster son offset de `-left-3` à `-left-1`, puisque le gap est maintenant beaucoup plus petit.

Un seul fichier modifié : `src/components/profile/UserProfileCard.tsx`.

