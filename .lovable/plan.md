

# Rendre la bannière et l'avatar directement cliquables

## Problème
Actuellement, des boutons avec icône Camera sont superposés sur la bannière et l'avatar. L'utilisateur veut que les images elles-mêmes soient cliquables, supprimant les boutons séparés.

## Changements dans `src/components/profile/ServerProfileEditModal.tsx`

### Bannière (lignes 154-165)
- Transformer le `div` de la bannière en zone cliquable avec `onClick={() => bannerInputRef.current?.click()}` et `cursor-pointer`
- Ajouter un overlay semi-transparent au hover avec une icône Camera centrée (comme dans `ProfileSettingsTab.tsx`)
- Supprimer le `<button>` séparé (lignes 158-163)
- Afficher un `Loader2` centré pendant l'upload

### Avatar (lignes 168-184)
- Ajouter `onClick={() => avatarInputRef.current?.click()}` et `cursor-pointer` sur le wrapper de l'Avatar
- Ajouter un overlay hover avec icône Camera sur l'avatar
- Supprimer le `<button>` séparé (lignes 176-181)
- Afficher un spinner pendant l'upload

### Pattern visuel
Même pattern que `ProfileSettingsTab.tsx` : overlay `bg-black/50 opacity-0 group-hover:opacity-100` avec icône centrée.

### Fichier modifié
- `src/components/profile/ServerProfileEditModal.tsx`

