

## Correctif : Supprimer le forçage en majuscules des noms de catégories sur mobile

### Problème
Dans `MobileChannelListView.tsx`, les noms de catégories utilisent la classe CSS `uppercase` qui force tout le texte en majuscules, indépendamment de ce que l'utilisateur a saisi.

### Solution
Retirer la classe `uppercase` du bouton de catégorie dans `MobileChannelListView.tsx` (ligne 131). Les noms de catégories s'afficheront tels que l'utilisateur les a écrits.

### Détail technique

**Fichier** : `src/components/mobile/MobileChannelListView.tsx`
- Ligne 131 : retirer `uppercase` de la classe CSS du bouton de catégorie
- Conserver `text-xs font-semibold text-muted-foreground tracking-wide` pour garder le style visuel

