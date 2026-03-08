

# Surélever le ThreadView en split-view

## Problème
Le `z-10` a bien été ajouté dans `ThreadView.tsx` (ligne 382), mais le conteneur parent dans `Index.tsx` (ligne 588) a `overflow-x-hidden` qui empêche l'ombre de déborder visuellement sur le chat. De plus, le wrapper div du ThreadView (ligne 681) n'a pas de z-index, donc le stacking context ne fonconne pas comme prévu.

## Solution
Ajouter `relative z-10` sur le **wrapper div** du ThreadView dans `Index.tsx` (ligne 681) pour que le panneau thread entier soit surélevé par rapport au panneau chat adjacent.

| Fichier | Ligne | Changement |
|---------|-------|-----------|
| `src/pages/Index.tsx` | 681 | `${threadFullscreen ? 'flex-1' : 'flex-[4]'} min-w-0` → `${threadFullscreen ? 'flex-1' : 'flex-[4]'} min-w-0 relative z-10` |

**1 fichier modifié, 1 ligne.**

