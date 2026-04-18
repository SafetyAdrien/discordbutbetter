

## Problème

Dans `MessageAttachments.tsx` (ligne 58), la classe `object-cover` combinée à `max-h-80 w-full` **recadre** l'image pour remplir le cadre, ce qui produit un effet zoom/crop. Les images d'en-tête d'annonces (souvent en format paysage/bannière) apparaissent zoomées et tronquées.

## Solution

Remplacer `object-cover` par `object-contain` (preserve le ratio, l'image entière reste visible). Adapter la classe pour conserver un rendu propre :

```tsx
'rounded-lg cursor-pointer max-h-96 max-w-full object-contain bg-surface-hover'
```

- `object-contain` — l'image conserve son ratio naturel, plus de zoom
- `max-h-96` (384px) — hauteur max augmentée pour mieux mettre en valeur les bannières d'annonces
- `bg-surface-hover` — léger fond derrière l'image pour les zones transparentes/letterbox
- Retirer `w-full` — laisser l'image prendre sa largeur naturelle (jusqu'au max du conteneur parent)

## Fichier modifié

- `src/components/chat/MessageAttachments.tsx` — modifier les classes du composant `ImageAttachment` (ligne 58) pour passer de `object-cover w-full` à `object-contain max-w-full` avec un fond neutre.

## Résultat

Les images publiées (notamment les bannières d'annonce) s'affichent dans leur ratio naturel sans recadrage. Plus aucun effet "zoom".

