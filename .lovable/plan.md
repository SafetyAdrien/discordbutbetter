

## Problème
Le fond `bg-surface-hover` ajouté précédemment sur les images (ligne 58) trahit la transparence des PNG : un rectangle gris coloré apparaît autour/derrière les images transparentes (logos, stickers, captures avec alpha), au lieu de laisser transparaître le fond du message.

## Solution
Retirer le fond opaque sur l'image. Le fond neutre n'était utile que pour les zones letterbox de bannières paysage très basses, mais il casse complètement le rendu des PNG transparents — usage bien plus fréquent.

### Changement
`src/components/chat/MessageAttachments.tsx`, ligne 58 :

**Avant :**
```tsx
'rounded-lg cursor-pointer max-h-96 max-w-full object-contain bg-surface-hover',
```

**Après :**
```tsx
'rounded-lg cursor-pointer max-h-96 max-w-full object-contain',
```

Le placeholder de chargement `bg-muted` (ligne 73) reste actif pendant le `onLoad`, donc aucun "flash blanc" pendant le chargement.

## Garantie "ne casse rien"
- `object-contain` reste — pas de re-zoom des bannières
- Hauteurs/largeurs max inchangées
- Spoiler, description, lightbox : intacts
- Carousel et vidéos : non modifiés

## Fichier modifié
- `src/components/chat/MessageAttachments.tsx` (1 classe retirée ligne 58)

## Résultat
Les PNG à fond transparent s'affichent correctement, sans rectangle gris parasite derrière l'image.

