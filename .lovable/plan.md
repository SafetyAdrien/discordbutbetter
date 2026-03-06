

# Reproduire le spine identique dans la liste des salons

## Probleme

Le spine dans `ChannelList.tsx` a ete reduit et modifie par rapport a l'original dans `ChatArea.tsx` :

| | ChatArea (original) | ChannelList (actuel) |
|---|---|---|
| Conteneur | `w-8` | `w-4` |
| Courbe | `w-[20px]` | `w-[10px]` |
| Margin | `mr-1.5` | aucun |

La courbe est trop petite et trop arrondie, et le spine n'est pas centre verticalement par rapport au lien du thread.

## Correction — `src/components/layout/ChannelList.tsx` (lignes 596-599)

Reprendre exactement les memes classes que dans `ChatArea.tsx` (lignes 1305-1307) :

```tsx
// Avant
<div key={thread.id} className="flex items-start w-full px-2">
  <div className="flex-shrink-0 w-4 h-5 relative mt-0.5">
    <div className="absolute left-[6px] top-0 w-[10px] h-1/2 border-l-2 border-b-2 border-muted-foreground/30 rounded-bl-lg" />
  </div>

// Apres — identique au spine de ChatArea
<div key={thread.id} className="flex items-center w-full px-2">
  <div className="flex-shrink-0 w-8 relative mr-1.5">
    <div className="absolute left-[6px] top-0 w-[20px] h-1/2 border-l-2 border-b-2 border-muted-foreground/30 rounded-bl-lg" />
  </div>
```

Changements :
- `items-start` → `items-center` pour centrer verticalement le spine par rapport au lien
- Conteneur : `w-4 h-5 mt-0.5` → `w-8 mr-1.5` (identique a ChatArea)
- Courbe : `w-[10px]` → `w-[20px]` (identique a ChatArea)

