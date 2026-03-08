

# Curseur de redimensionnement système Windows

Le curseur `col-resize` (↔ double flèche) est déjà le curseur système standard sur Windows pour le redimensionnement horizontal. Cependant, si l'utilisateur veut le curseur `ew-resize` (qui sur Windows affiche la flèche bidirectionnelle native), on peut uniformiser.

En réalité `col-resize` et `ew-resize` sont quasi-identiques sur Windows. Le vrai curseur Windows natif de redimensionnement de fenêtre est `ew-resize`.

## Changements

Remplacer `cursor-col-resize` par `cursor-ew-resize` dans 3 endroits :

1. **`src/index.css`** ligne 764 — `.resize-handle`
2. **`src/pages/Index.tsx`** ligne 689 — thread resize handle
3. **`src/components/layout/ChannelList.tsx`** ligne 1373 — channel list resize handle

