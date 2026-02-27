
# Reactivity des roles et raccourci clic-droit

## Probleme

Le composant `RoleAssignmentPopover` maintient un etat local (`optimisticRoleIds`) qui se desynchronise du cache React Query. De plus, il ne passe pas l'objet `role` complet aux mutations, ce qui fait que l'optimistic update dans `useRoles.ts` n'a que `{ id: roleId }` sans les infos de nom/couleur. Le composant `RoleCheckboxItem` utilise deja le bon pattern (lecture directe du cache React Query).

## Changements

### 1. `src/components/members/RoleAssignmentPopover.tsx` - Refonte complete

Remplacer l'etat local `optimisticRoleIds` / `pendingRoleIds` par le meme pattern que `RoleCheckboxItem` :
- Lire l'etat des roles directement depuis le cache React Query (`['members', serverId]`) au lieu de maintenir un `useState<Set>`.
- Utiliser `RoleCheckboxItem` directement au lieu de reimplementer la logique de toggle.
- Supprimer les `useEffect` de synchronisation qui causent les desynchronisations.
- Passer le `role` complet dans les appels de mutation pour que l'optimistic update ait toutes les donnees (nom, couleur, icone).

### 2. `src/components/layout/MemberList.tsx` - Ajouter "Gerer les roles" au menu contextuel

Ajouter un `ContextMenuItem` avec l'icone `Shield` et le label "Gerer les roles" dans le menu contextuel de chaque membre. Au clic, ouvrir le `RoleAssignmentPopover` (ou un equivalent). Conditionner l'affichage a `canManageRoles` et au fait que l'utilisateur cible n'est pas le proprietaire.

Approche technique :
- Importer `RoleAssignmentPopover` dans `MemberList.tsx`.
- Ajouter un etat `roleAssignmentTarget` pour stocker le membre cible.
- Le `ContextMenuItem` "Gerer les roles" ouvrira le popover via cet etat.
- Condition d'affichage : `canManageRoles && !isOwner && !isSecondaryOwner`.

## Fichiers modifies

- `src/components/members/RoleAssignmentPopover.tsx` : refonte pour utiliser `RoleCheckboxItem` et le cache React Query
- `src/components/layout/MemberList.tsx` : ajout du raccourci "Gerer les roles" dans le ContextMenu
