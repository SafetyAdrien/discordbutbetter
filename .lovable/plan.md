## Plan

### 1. Pagination infinie dans `DMConversation.tsx`
- Récupérer `loadOlder`, `hasMoreOlder`, `isLoadingOlder` depuis `useDMMessages`.
- Ajouter un handler `onScroll` sur le conteneur scrollable : si `scrollTop < 150` et `hasMoreOlder` et `!isLoadingOlder`, mémoriser `scrollHeight` avant fetch puis appeler `loadOlder()`.
- Après mise à jour (via `useLayoutEffect` qui observe la longueur de messages), restaurer `scrollTop = newScrollHeight - savedScrollHeight` pour garder la position visuelle.
- Ajouter un petit spinner en haut quand `isLoadingOlder` est vrai.
- Reproduire exactement le pattern déjà utilisé dans `ChatArea.tsx` pour `useMessages`.

### 2. Adoption de `UserAvatarImage` partout
Remplacer les `<Avatar>` + `<AvatarImage>` + `<AvatarFallback>` bruts par `<UserAvatarImage>` dans :
- `src/components/layout/MemberList.tsx`
- `src/components/profile/ProfileSettings.tsx`
- `src/components/profile/ServerProfileEditModal.tsx` (avatar du profil serveur)
- `src/components/profile/CustomStatusModal.tsx`
- `src/components/profile/EveryoneHerePopup.tsx`
- `src/components/profile/RoleInfoPopup.tsx` (avatars des membres listés)

Pour chacun : conserver les classes existantes (taille, ring, border), passer `src`, `alt`, `fallback` (initiale), `className`, et garder en overlay les indicateurs de statut/decorations déjà présents (le wrapper `relative` reste autour).

### Hors scope
- Aucune logique backend modifiée.
- Pas de changement du composant `UserAvatarImage` lui-même.
- Pas de refonte visuelle, seulement le swap + le skeleton/fade-in qu'il apporte.
