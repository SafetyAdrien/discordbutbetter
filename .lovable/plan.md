

# Fix: Placer TOUS les timestamps à droite du Display Name

## Problème
La ligne 1504 du `ChatArea.tsx` définit le conteneur flex du header de message avec `min-w-0 overflow-hidden`. Cela peut couper ou mal positionner le timestamp quand le nom ou les badges prennent de la place. Le timestamp (ligne 1522-1539) est dans le bon ordre dans le DOM mais n'est pas visuellement forcé à rester à droite.

## Solution

**`src/components/chat/ChatArea.tsx`** (ligne 1504) :
- Retirer `overflow-hidden` du conteneur flex du header
- S'assurer que le conteneur flex ne wrap pas : ajouter `flex-nowrap`
- Le timestamp avec `flex-shrink-0` restera toujours visible à droite du nom

Changement :
```
// Avant
<div className="flex items-baseline gap-2 min-w-0 overflow-hidden">

// Après  
<div className="flex items-baseline gap-2 flex-nowrap">
```

Un seul fichier modifié, une seule ligne.

