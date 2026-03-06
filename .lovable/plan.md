

# Corriger les liaisons entre spines des threads

## Probleme

En regardant l'image de reference, deux problemes sont visibles :

1. **Separation entre spines** : les spines ne sont pas connectes entre eux — il y a un espace vertical entre chaque thread a cause du `space-y-0.5` sur le conteneur parent et du fait que la ligne verticale utilise `bg-muted-foreground/30` (un fond) tandis que la courbe utilise `border-muted-foreground/30` (une bordure). Ces deux rendus peuvent avoir une teinte legerement differente.

2. **Liaison imparfaite** : la ligne verticale doit etre parfaitement continue d'un thread au suivant, sans aucun gap.

## Solution — `src/components/layout/ChannelList.tsx`

### 1. Supprimer l'espacement entre threads
Ligne 592 : `space-y-0.5` → supprimer pour que les threads soient colles verticalement.

### 2. Unifier la teinte du spine
Remplacer `bg-muted-foreground/30` (fond) sur la ligne verticale par `border-l-2 border-muted-foreground/30` (bordure) pour que la ligne verticale et la courbe utilisent exactement le meme rendu CSS.

### 3. Structure corrigee

```tsx
// Conteneur : retirer space-y-0.5
<div className="mt-1">
  {threads.filter(...).map((thread, index, filteredArr) => {
    const isLast = index === filteredArr.length - 1;
    const isSingle = filteredArr.length === 1;
    return (
      <div key={thread.id} className="flex items-center w-full px-2">
        <div className="flex-shrink-0 w-6 relative self-stretch">
          {/* Ligne verticale continue — meme border que la courbe */}
          {!isSingle && (
            <div 
              className="absolute left-[5px] top-0 border-l-2 border-muted-foreground/30"
              style={{ height: isLast ? '50%' : '100%' }}
            />
          )}
          {/* Courbe en L */}
          <div className="absolute left-[5px] top-1/2 -translate-y-1/2 w-[14px] h-[12px] border-l-2 border-b-2 border-muted-foreground/30 rounded-bl-lg" />
        </div>
        {/* thread button */}
      </div>
    );
  })}
</div>
```

Changements cles :
- `space-y-0.5` supprime → plus de gap entre les threads
- Ligne verticale : `w-0.5 bg-muted-foreground/30` → `border-l-2 border-muted-foreground/30` (meme rendu que la courbe)
- `left-[6px]` → `left-[5px]` sur les deux elements pour aligner parfaitement la bordure de la ligne verticale avec celle de la courbe (border-l-2 = 2px, donc le bord gauche est a 5px)

Un seul fichier modifie : `src/components/layout/ChannelList.tsx`

