

# Alignement du nom de serveur — côté gauche, centré verticalement

## Constat actuel
Le header du serveur dans `ChannelList.tsx` (l.1399-1415) utilise `justify-center` et `text-center`, ce qui centre le nom au milieu horizontalement. L'utilisateur veut le nom aligné à gauche, centré verticalement, avec une marge par rapport aux bords.

## Changements

### `src/components/layout/ChannelList.tsx`

**Ligne 1400** — Le bouton Popover trigger :
- `justify-center` → `justify-start`

**Ligne 1405** — Le div contenant le nom :
- `text-center` → `text-left`
- `px-3` → `px-4` (légèrement plus de marge intérieure)

### `src/components/mobile/MobileChannelListView.tsx`
Appliquer le même alignement gauche + marge sur les headers serveur mobile (même logique : `text-left`, `justify-start`, `px-4`).

