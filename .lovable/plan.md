

# Remplacer l'icône ThreadBranch par le spine CSS dans la liste des salons

## Contexte

Dans la liste des salons (`ChannelList.tsx`, ligne 597), les threads utilisent l'icône SVG `StreamlineThreadBranch`. L'utilisateur veut la remplacer par un élément CSS identique au spine du message système thread dans `ChatArea.tsx` : une courbe en L avec `border-l-2 border-b-2 border-muted-foreground/30 rounded-bl-lg`.

## Changement — `src/components/layout/ChannelList.tsx` (ligne 596-597)

Remplacer le `<StreamlineThreadBranch>` par un `div` reproduisant exactement le spine :

```tsx
// Avant
<div key={thread.id} className="flex items-start w-full px-2">
  <StreamlineThreadBranch className="w-4 h-4 text-muted-foreground shrink-0 mt-1.5" />

// Après
<div key={thread.id} className="flex items-start w-full px-2">
  <div className="flex-shrink-0 w-4 h-5 relative mt-0.5">
    <div className="absolute left-[6px] top-0 w-[10px] h-1/2 border-l-2 border-b-2 border-muted-foreground/30 rounded-bl-lg" />
  </div>
```

L'import `StreamlineThreadBranch` (ligne 36) peut être supprimé s'il n'est plus utilisé ailleurs dans le fichier.

| Fichier | Changement |
|---|---|
| `src/components/layout/ChannelList.tsx` | Remplacer l'icône SVG par le spine CSS |

