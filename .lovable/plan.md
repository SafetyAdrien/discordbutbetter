Simplifier le tooltip du badge anniversaire pour afficher uniquement le nom du badge, dans les deux composants qui le rendent.

### Modifications

1. `src/components/badges/InlineBadgeStrip.tsx`
   - Pour le badge `birthday`, ne conserver que le nom (`b.name`) dans le `TooltipContent`.
   - Supprimer la description et la ligne "Célébré en ..." pour ce badge.

2. `src/components/badges/UserBadgeList.tsx`
   - Même traitement : tooltip anniversaire réduit au seul nom du badge.

### Non concerné
- Les autres badges conservent leur nom + description actuelle.
- La logique d'attribution/calcul des années d'anniversaire reste en place côté hooks.