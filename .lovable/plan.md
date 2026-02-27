

# Ouvrir uniquement le panneau de roles (sans le profil) depuis le menu contextuel

## Objectif

Quand l'utilisateur clique sur "Gerer les roles" dans le menu contextuel de la liste des membres, afficher **uniquement** le panneau lateral de gestion des roles (le meme design que celui qui apparait a cote du profil), sans ouvrir la carte de profil du membre.

## Changements

### 1. Extraire le panneau de roles dans un composant autonome

Creer `src/components/members/RoleManagementPanel.tsx` qui reprend exactement le design du `RoleSidePanel` actuellement imbrique dans `UserProfilePopup.tsx` :

- Header "Gerer les roles" avec bouton X pour fermer
- ScrollArea avec la liste des `RoleCheckboxItem`
- Memes styles (bg-card, border, rounded-lg, shadow-2xl)

Props : `serverId`, `memberId`, `userId`, `onClose`

### 2. Modifier `MemberList.tsx`

- Supprimer l'approche actuelle qui ouvre le `UserProfilePopup` avec `initialShowRolePanel` et `openWithRoles`.
- Remplacer par un rendu direct du `RoleManagementPanel` dans un Portal, positionne de maniere absolue (similaire au positionnement actuel de la carte profil, mais sans la carte).
- Le state `openWithRoles` + `roleAssignmentTarget` (ou equivalent) controle l'affichage du panneau seul.
- Cliquer en dehors ferme le panneau.

### 3. Nettoyer `UserProfilePopup.tsx`

- Supprimer la prop `initialShowRolePanel` et le `useEffect` associe.
- Garder le `RoleSidePanel` interne tel quel (il est toujours utilise quand on clique "Gerer les roles" depuis la carte profil elle-meme).

## Fichiers concernes

| Fichier | Action |
|---|---|
| `src/components/members/RoleManagementPanel.tsx` | Nouveau — panneau autonome de gestion des roles |
| `src/components/layout/MemberList.tsx` | Remplacer ouverture profil par rendu du panneau seul |
| `src/components/profile/UserProfilePopup.tsx` | Supprimer `initialShowRolePanel` et le useEffect associe |

