## Objectif
Compresser légèrement la hauteur de la barre de profil en bas de l'écran, sans toucher au badge vocal au-dessus.

## Fichiers concernés
- `src/pages/Index.tsx` : conteneur avec hauteur fixe (`h-[68px]`) pour `UserProfileCard`.
- `src/components/profile/UserProfileCard.tsx` : padding vertical interne et disposition.

## Ce qui ne sera PAS modifié
- Le composant `VoiceStatusBadge` situé juste au-dessus de la barre de profil reste inchangé.

## Modifications prévues
1. Réduire la hauteur fixe du conteneur `UserProfileCard` dans `Index.tsx` (ligne 903) : `h-[68px]` → `h-[60px]`.
2. Ajuster le padding vertical de la carte dans `UserProfileCard.tsx` (ligne 131) : `py-1.5` → `py-1` pour garder le contenu centré dans la nouvelle hauteur.

## Vérification
- Build TypeScript/Tailwind OK.
- Rendu visuel compact : le badge vocal garde sa hauteur, la barre de profil en dessous est plus courte, et le contenu (avatar + nom + boutons vocaux) reste aligné et lisible.