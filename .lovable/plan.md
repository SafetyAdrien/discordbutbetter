

# Corriger le spine complet dans la liste des salons

## Probleme actuel

Le spine actuel dans `ChannelList.tsx` ne montre que la courbe en L (`h-1/2`), sans la ligne verticale qui descend depuis le salon parent. Dans `ChatArea.tsx`, ca fonctionne car le conteneur a la hauteur du thread embed entier. Dans la liste des salons, le conteneur est trop petit (une seule ligne de texte), donc le spine est incomplet.

De plus, quand il y a **plusieurs threads** sous un salon, il faut une ligne verticale continue qui relie tous les threads, avec la courbe pour chacun.

## Solution — `src/components/layout/ChannelList.tsx` (lignes 596-599)

Reproduire un spine complet avec :
- **Ligne verticale** descendant sur toute la hauteur pour les threads non-derniers
- **Ligne verticale tronquee** s'arretant au milieu pour le dernier thread
- **Courbe en L** (`border-l-2 border-b-2 rounded-bl-lg`) a chaque thread

```tsx
// Pour chaque thread
<div key={thread.id} className="flex items-center w-full px-2">
  <div className="flex-shrink-0 w-8 relative mr-1.5 self-stretch">
    {/* Ligne verticale - pleine hauteur sauf dernier */}
    <div 
      className="absolute left-[6px] top-0 w-0.5 bg-muted-foreground/30" 
      style={{ height: isLast ? '50%' : '100%' }} 
    />
    {/* Courbe en L */}
    <div className="absolute left-[6px] top-1/2 -translate-y-1/2 w-[20px] h-[12px] border-l-2 border-b-2 border-muted-foreground/30 rounded-bl-lg" />
  </div>
  {/* Thread button */}
</div>
```

La variable `isLast` sera determinee via l'index du thread dans le tableau filtre.

| Element | Detail |
|---|---|
| Ligne verticale | `w-0.5 bg-muted-foreground/30`, hauteur 100% ou 50% selon position |
| Courbe | `w-[20px] h-[12px] border-l-2 border-b-2 rounded-bl-lg`, centree verticalement |
| Conteneur | `self-stretch` pour prendre la hauteur complete de la ligne |

Un seul fichier modifie : `src/components/layout/ChannelList.tsx`

