# Popup riche au clic sur une mention de rôle

Objectif: quand l'utilisateur clique sur une mention `@role` rendue par `RoleMention`, ouvrir un Popover qui affiche un en-tête du rôle, un compteur online/offline, les permissions clés (badges), la liste défilable des membres ayant ce rôle, et deux actions rapides (filtrer la liste des membres par ce rôle, copier l'ID Snowflake du rôle).

## Surface et déclencheur

- Activé partout où `RoleMention` est rendu (chat serveur, threads, annonces, groupes DM si applicable) — via `src/lib/markdown.tsx`.
- Ouverture sur **clic simple** (le Tooltip de survol actuel reste comme aperçu rapide nom+couleur).
- Mobile et desktop: même Popover Radix; sur mobile petit, on conserve le Popover (compact, non plein écran) pour rester proche du Discord-like.

## Nouveau composant

`src/components/profile/RoleInfoPopup.tsx`
- Props: `roleId`, `serverId`, `children` (le trigger = la pill `RoleMention`).
- Utilise `Popover` (`@/components/ui/popover`) avec un contenu ~320px de large.
- Contenu:
  1. **Header** — pastille de couleur du rôle + icône (si `icon_url`) + nom (couleur = `role.color`), bouton "Copier l'ID" en haut-droite (icône `Copy`, copie le Snowflake via `uuidToSnowflake`).
  2. **Stats** — ligne avec compteur total et répartition `● online`, `● idle`, `● dnd`, `○ offline` (utilise `PresenceContext` ou les statuts déjà résolus dans `useMembers`).
  3. **Permissions clés** — badges horizontaux pour un sous-ensemble important: `administrator`, `manage_server`, `manage_channels`, `manage_roles`, `kick_members`, `ban_members`, `mention_everyone`, `manage_messages`. Masquées si aucune. Tooltip = libellé long.
  4. **Membres** — `ScrollArea` max-h 240px, lignes `Avatar 24px + displayName + dot statut`. Tri: online d'abord, puis alpha. Clic sur un membre = ouvre `FullUserProfileModal` ou `UserProfilePopup` (réutilise l'API existante via un callback `onMemberClick`).
  5. **Footer actions** — bouton `Filtrer les membres par ce rôle` (icône `Filter`) → applique le filtre dans `MemberList`. Bouton `Mentionner` est exclu (non demandé).

## Câblage des données

- Récupérer le rôle via `useRoles(serverId)` (déjà disponible). Pas de nouvelle requête.
- Récupérer les membres via `useMembers(serverId)` + filtrer par `member.roles.includes(roleId)` (la forme existe déjà dans le hook).
- Statut online/idle/dnd/offline: lire via `usePresence` / `PresenceContext` ou champ `status` déjà exposé dans `useMembers`.
- Pas de migration BDD. Aucune nouvelle table.

## Intégration dans `RoleMention`

`src/components/chat/mentions/MentionComponents.tsx`:
- Ajouter une prop optionnelle `serverId?: string` à `RoleMention`.
- Si `serverId` est fourni, envelopper la pill dans `<RoleInfoPopup roleId={...} serverId={...}>…</RoleInfoPopup>`. Sinon, fallback au comportement actuel (juste tooltip).
- Conserver le Tooltip existant uniquement en survol prolongé; sur clic, ouvrir le Popover.

`src/lib/markdown.tsx` (ligne 555):
- Passer `serverId` (déjà disponible dans le contexte de rendu markdown via `currentServerId` / `serverContext`) à `RoleMention`.

## Filtrer la liste des membres

État partagé léger pour transporter le filtre du popup vers `MemberList`:
- Ajouter un store minimal `src/hooks/useMemberRoleFilter.ts` (zustand léger ou simple custom hook avec un `useSyncExternalStore` global, comme déjà fait ailleurs dans le projet) exposant `{ roleId, setRoleId, clear }`.
- `MemberList.tsx`: si `roleId` filtre actif, n'affiche que les membres ayant ce rôle + bandeau top "Filtré par @RoleName ✕" pour reset.
- Sur mobile, `MemberList` est dans l'onglet membres; même comportement, le bandeau reste sticky.

## Copier l'ID

- Utilise `uuidToSnowflake(roleId)` (cf. `src/lib/snowflake.ts`) + `navigator.clipboard.writeText(...)` + toast `sonner` "ID copié".

## Accessibilité / Style

- `role="dialog"` géré par Popover Radix. Focus auto sur le premier élément focusable.
- Couleurs: header utilise `role.color` (fallback `#99aab5`). Reste du popup en tokens sémantiques (`bg-popover`, `text-foreground`, `border-border` — déjà conforme aux conventions du projet).
- Aucune classe interdite (`text-white`, `bg-black`) introduite.

## Détails techniques

- Aucun fichier auto-généré modifié (`client.ts`, `types.ts`, `.env`).
- Aucune migration. `useRoles`, `useMembers`, `usePresence` déjà câblés.
- Réutilise `Popover`, `ScrollArea`, `Avatar`, `Badge`, `Button`, `Tooltip` existants.
- Performance: les listes longues sont rares pour un rôle; pas de virtualization nécessaire en V1 (cap visuel via ScrollArea).
- Tests: ajout d'un test léger `RoleInfoPopup.test.tsx` (rendu header + filtre déclenche `setRoleId`).

## Fichiers touchés

- créé: `src/components/profile/RoleInfoPopup.tsx`
- créé: `src/hooks/useMemberRoleFilter.ts`
- créé: `src/components/profile/__tests__/RoleInfoPopup.test.tsx`
- édité: `src/components/chat/mentions/MentionComponents.tsx` (envelopper `RoleMention`)
- édité: `src/lib/markdown.tsx` (passer `serverId` à `RoleMention`)
- édité: `src/components/layout/MemberList.tsx` (lire le filtre + bandeau reset)
