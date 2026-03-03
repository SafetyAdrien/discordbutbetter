

# Améliorer le spacing du modal "Modifier le profil serveur"

## Problème
Le contenu du modal est trop serré : l'avatar colle au formulaire, le formulaire manque de marge interne, et les actions en bas n'ont pas assez de séparation visuelle.

## Changements dans `src/components/profile/ServerProfileEditModal.tsx`

### Spacing ajusté
- **Avatar → Form** : Ajouter `mt-3` après le bloc avatar (ligne 168) pour espacer l'avatar du formulaire
- **Form container** : Passer de `p-4 space-y-4` à `px-5 pb-5 pt-3 space-y-5` (ligne 187) pour plus de respiration
- **Header** : Passer de `px-4 pt-4 pb-3` à `px-5 pt-5 pb-4` (ligne 115) pour harmoniser
- **Actions** : Passer de `pt-2` à `pt-4 border-t border-border` (ligne 242) pour séparer visuellement les boutons du formulaire
- **Banner → Avatar** : garder le `-mt-10` existant (bon overlap visuel)

### Fichier modifié
- `src/components/profile/ServerProfileEditModal.tsx` — classes Tailwind uniquement

