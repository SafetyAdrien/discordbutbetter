

# Fix: Bio textarea overflow et synchronisation Markdown

## Problème
Le textarea bio a une hauteur fixe (`min-h-[80px]`, `rows=3`) et ne s'agrandit pas quand le texte dépasse. Le texte déborde visuellement de la box. L'overlay Markdown doit rester parfaitement synchronisé.

## Solution
Ajouter un auto-resize au textarea avec un `max-height` pour limiter la croissance, et synchroniser l'overlay.

### 1. `src/components/account-settings/ProfileSettingsTab.tsx`
- Ajouter une fonction `autoResizeBio` qui ajuste `textarea.style.height` au `scrollHeight` à chaque `onChange`
- Appliquer `max-h-[200px]` au textarea pour limiter la hauteur et activer le scroll au-delà
- Appliquer les mêmes contraintes `min-h-[80px] max-h-[200px] overflow-y-auto` au `className` de l'`InputMarkdownOverlay`
- Appeler `autoResizeBio` dans un `useEffect` à chaque changement de `formData.bio`

### 2. `src/components/profile/ServerProfileEditModal.tsx`
- Même traitement : auto-resize + `max-h-[200px]` sur textarea et overlay

### 3. Détails techniques
- `autoResizeBio` : reset `height = 'auto'`, puis `height = Math.min(scrollHeight, 200) + 'px'`
- Le textarea garde `resize-none` pour empêcher le resize manuel
- L'overlay reçoit `className="px-3 py-2 min-h-[80px] max-h-[200px] overflow-y-auto"` pour défiler en sync
- Le `syncBioScroll` existant assure déjà la synchronisation du scroll

### Fichiers modifiés
- `src/components/account-settings/ProfileSettingsTab.tsx`
- `src/components/profile/ServerProfileEditModal.tsx`

