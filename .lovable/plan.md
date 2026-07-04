## Contexte

Sur le popup profil desktop (`UserProfilePopup`), le système d'anniversaire pose 3 problèmes visuels :

1. Un anneau doré animé + emoji 🎂 sont superposés sur l'avatar (au niveau du point de statut).
2. Le badge d'anniversaire s'affiche dans une ligne dédiée sous `@username`, au lieu d'être aligné à droite de la ligne avatar (comme sur mobile).
3. Le tooltip du badge est trop grand.

## Changements

### 1. Supprimer la décoration anniversaire sur l'avatar (desktop uniquement)

Dans `src/components/ui/user-avatar-image.tsx`, ajouter une prop `showBirthdayCrown` déjà présente — l'utiliser à `false` là où c'est desktop. Plus simple : puisque la couronne dorée est jugée « inutile et moche », la supprimer partout (mobile et desktop) — mobile n'utilisait de toute façon pas `UserAvatarImage` (il utilise `Avatar` shadcn). Concrètement :

- Retirer le bloc `{isBirthday && showBirthdayCrown && <BirthdayAvatarCrown ... />}` dans `UserAvatarImage`.
- Ne plus importer `BirthdayAvatarCrown` ni `useIsBirthday` dans ce fichier.
- Le fichier `BirthdayAvatarCrown.tsx` devient orphelin (peut rester, non supprimé — évite les régressions).

Effet : plus d'anneau doré ni d'emoji 🎂 collé au statut sur les profils desktop, DM, membres, etc.

### 2. Déplacer le badge d'anniversaire à droite de l'avatar dans `UserProfilePopup`

Dans `src/components/profile/UserProfilePopup.tsx` :

- Remplacer `UserBadgeList` (ligne ~513, sous la carte nom/username) par `InlineBadgeStrip` positionné dans la ligne avatar (ligne ~457-485), aligné à droite, à la manière mobile.
- Structure : wrap `<div className="relative -mt-10 mb-2 flex items-end justify-between gap-2">` avec l'avatar (existant) à gauche et `<InlineBadgeStrip userId={user.id} max={4} className="mb-1 max-w-[60%] justify-end" />` à droite.
- Retirer complètement le bloc `UserBadgeList` situé après le nom.

### 3. Réduire la taille du tooltip du badge anniversaire

Dans `src/components/badges/InlineBadgeStrip.tsx` :

- Passer `TooltipContent` de `max-w-[240px]` à `max-w-[180px]`.
- Réduire le nom : `font-semibold` → `text-xs font-semibold`.
- Réduire la description : `text-xs` → `text-[10px]`.
- Réduire l'année : `text-xs` → `text-[10px]`.

Aucun autre fichier touché. Aucune logique métier modifiée. Rien touché aux icônes de copie.