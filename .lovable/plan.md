

# Aligner la spine et ajouter du spacing au message système thread

## Changements dans `src/components/chat/ChatArea.tsx`

### 1. Centrer verticalement la courbe de la spine
La courbe L doit se terminer horizontalement au milieu du conteneur thread embed. Actuellement `h-full` fait que la courbe occupe toute la hauteur. Il faut utiliser `h-1/2` pour que le bord inférieur (horizontal) de la courbe arrive au milieu du conteneur embed.

### 2. Ajouter du spacing
Ajouter `mt-1.5` ou `mt-2` au conteneur `flex` (ligne 1303) pour espacer le message système texte du conteneur thread embed.

### Modifications (ligne 1303-1306)

```tsx
// Avant
<div className="flex mt-0.5">
  <div className="flex-shrink-0 w-[52px] relative">
    <div className="absolute left-5 top-0 w-[18px] h-full border-l-2 border-b-2 ..." />
  </div>

// Après
<div className="flex mt-1.5">
  <div className="flex-shrink-0 w-[52px] relative">
    <div className="absolute left-5 top-0 w-[18px] h-1/2 border-l-2 border-b-2 ..." />
  </div>
```

| Fichier | Changement |
|---|---|
| `src/components/chat/ChatArea.tsx` | `mt-0.5` → `mt-1.5`, `h-full` → `h-1/2` |

