
# Appliquer la teinte `surface-header` aux headers Mobile

## Contexte
Le header desktop du serveur utilise `bg-[hsl(var(--surface-header))]` (`#12161c` / `216 22% 9%`), mais les headers mobile utilisent `bg-surface-elevated` (une teinte differente, plus claire).

## Changements

### Fichier : `src/components/mobile/MobileChannelListView.tsx`

Remplacer `bg-surface-elevated` par `bg-[hsl(var(--surface-header))]` aux 4 endroits suivants :

1. **Ligne 449** - Barre de recherche sous la banniere
2. **Ligne 464** - Header sans banniere (mode non-embedded)
3. **Ligne 492** - Header sans banniere (mode embedded)
4. **Ligne 519** - Barre de recherche sans banniere

### Fichier : `src/components/mobile/MobileHomeView.tsx`

Appliquer `bg-[hsl(var(--surface-header))]` aux headers de la vue DM/Home :

1. **Ligne 41** - Header "Amis"
2. **Ligne 55** - Header "Boite de reception"
3. **Ligne 69** - Header "Messages"

Cela harmonisera la teinte sombre `#12161c` entre desktop et mobile pour tous les headers de serveur et de la vue home.
