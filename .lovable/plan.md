

# Correctifs ChannelOverview

## 3 problemes

1. **Label "Modifier"** (ligne 234-236) : L'overlay hover affiche "Modifier" dans le cercle du hashtag. A supprimer.

2. **Taille de l'image dans le cropper** : Les images PNG larges ne s'adaptent pas bien dans le dialog de 400px max. Reduire `maxDimension` du cropper ou contraindre l'image importee avant de l'envoyer au cropper (via `object-contain` + taille max CSS).

3. **Bouton "Enregistrer" desactive** : `hasChanges` (ligne 100-104) ne prend pas en compte le changement d'icone (`iconUrl !== channel.icon_url`). Quand on change l'icone via upload, le save est deja fait immediatement dans `handleCropComplete`, donc le bouton reste desactive. Le probleme est que l'utilisateur s'attend a pouvoir cliquer "Enregistrer" apres avoir change l'icone. Solution : inclure `iconUrl !== (channel.icon_url ?? null)` dans `hasChanges`, et deplacer l'upload/save de l'icone dans `handleSave` au lieu de le faire immediatement dans `handleCropComplete`.

## Changements dans `src/components/channel-settings/ChannelOverview.tsx`

### A. Supprimer l'overlay "Modifier"
- Retirer les lignes 233-236 (le `<div>` avec le texte "Modifier")

### B. Adapter le cropper pour les grandes images
- Dans `ImageCropper`, l'image est deja contrainte a `max-h-[400px] object-contain`, donc ca devrait aller. Le vrai souci est le `maxDimension={128}` qui compresse l'output a 128px. Ca ne change pas la resolution du cropper lui-meme. Garder tel quel car c'est pour l'icone finale (petite).

### C. Permettre "Enregistrer" apres changement d'icone
- Changer `handleCropComplete` : au lieu d'uploader et sauvegarder immediatement, stocker le blob localement dans un state `pendingIconBlob`
- Ajouter `pendingIconBlob` dans le calcul de `hasChanges`
- Dans `handleSave`, si `pendingIconBlob` existe, uploader + sauvegarder l'icone avec les autres champs
- Si l'utilisateur clique "Retirer l'icone", ca met aussi `pendingIconBlob = null` et `iconUrl = null`, et `hasChanges` detecte le changement

## Fichier modifie
- `src/components/channel-settings/ChannelOverview.tsx`

