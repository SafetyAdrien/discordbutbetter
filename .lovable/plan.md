## Objectif

Refondre `UserProfilePopup` pour matcher le style Discord compact (~340px) montré dans la vidéo, sans toucher au backend ni au modal complet (`FullUserProfileModal`).

## Changements visuels (uniquement `src/components/profile/UserProfilePopup.tsx`)

### Layout & dimensions
- Largeur fixe `w-[340px]` (au lieu du dialog plein standard), `rounded-xl`, fond `bg-card`, bordure fine et ombre douce.
- Bannière `h-[90px]`, padding interne resserré (`p-3`).

### Avatar + statut personnalisé en bulle
- Avatar `w-[72px]` chevauchant la bannière (`-mt-10`), bordure épaisse couleur card, pastille de statut en bas-droite.
- Si `user.customStatus` existe : afficher une **bulle flottante** à droite de l'avatar (`bg-popover`, `rounded-2xl`, petite flèche/coin pointant vers l'avatar) contenant le texte du statut tronqué sur 1 ligne. Remplace l'actuelle ligne italique sous le nom.

### Bloc nom (carte intérieure unifiée Discord-style)
- Encapsuler nom + username + badges + bio + roles dans un sous-bloc `bg-background/40 rounded-lg p-3` (effet "carte dans la carte" visible dans la vidéo).
- Ligne 1 : `displayName` (gras, `text-base`) + badge pronoms inline.
- Ligne 2 : `@username` · séparateur `·` · (langue si dispo) · badge tag serveur (premier rôle "tag-like" si présent).
- Ligne 3 : **rangée de badges/icônes** (`flex gap-1`) — affichage purement visuel basé sur des flags optionnels du profil (`badges?: string[]` lu défensivement via `(user as any).badges`). Si vide, ne rien afficher. Tooltip sur chaque badge avec son nom. Aucune migration DB.

### Bio compacte + lien
- Section "À Propos" : afficher la bio rendue avec `line-clamp-3`.
- Si la bio dépasse (longueur > ~180 chars), afficher un lien `View Full Bio` (FR : "Voir la bio complète") en `text-xs text-primary` qui ouvre `FullUserProfileModal` déjà existant (ajouter un état local `fullBioOpen`).

### Rôles avec retrait rapide (✕)
- Tags rôles plus compacts (`px-1.5 py-0.5 text-[11px]`), pastille de couleur ronde à gauche.
- Si `canManageRoles` : ajouter un bouton `✕` à droite de chaque tag (apparition au hover du tag, `opacity-0 hover:opacity-100`) qui appelle un nouveau handler `handleRemoveRole(roleId)` utilisant la mutation existante d'assignation de rôles (réutiliser la logique du `RoleCheckboxItem` / hook actuel — décocher = retirer). Garder le bouton `+` final (style Discord) qui ouvre le panneau de gestion existant (`setShowRolePanel(true)`).
- Si aucun rôle : ne rien afficher (au lieu du texte "Aucun rôle assigné").

### Bouton principal en bas
- Garder le bouton `Edit Profile` (propre profil) / `Send Message` (autre) déjà présents mais en pleine largeur `w-full`, hauteur `h-9`, `rounded-md`, style primaire plein (comme dans la vidéo).
- Icônes d'action (message / ami) conservées en haut-droite de la bannière (inchangées).

### Conservations
- Volume slider voice (inchangé).
- Section activité / rich presence (inchangée mais resserrée).
- Kick / Ban (inchangé, dans le menu existant).
- Mode `card` vs `dialog` + `cardPosition` (inchangé).
- Drawer mobile (inchangé, juste contenu ré-emballé).

## Hors scope (à ne PAS faire)
- Pas de "Game Collection" (nécessiterait du backend).
- Pas de nouvelle table/colonne DB.
- Pas de modification de `FullUserProfileModal`, `UserProfileCard`, ni des hooks de rôles/amis.
- Pas de changement de l'API du composant (`UserProfilePopupProps` inchangé).

## Fichier touché
- `src/components/profile/UserProfilePopup.tsx` (édition unique).
