# Plan: Persistance et instantanéité des nouvelles fonctionnalités

## Constat

Audit du cache cache-first (`cacheGetSync` / `placeholderData`) :

- `useMessages`, `useThreadMessages`, `useDMMessages`, `useThreads`, `useDMs`, `useMembers`, `useServerRoles` → **déjà cache-first** ✓
- Les messages persistent `repliedMessage` (snapshot complet : auteur, contenu, pièces jointes) dans le cache → **la RepliedLine s'affiche déjà instantanément après refresh** ✓
- IndexedDB + miroir localStorage + warmCache au boot → ✓

**Trois trous restants empêchent la nouvelle popup de rôle de fonctionner après un refresh selon la surface :**

1. **`markdownContext.serverId` n'est positionné que dans `ChatArea`** — pas dans `AnnouncementChannel` ni `ThreadView`. Après un refresh direct sur un salon d'annonces ou un thread, `RoleMention` reçoit `serverId=undefined` et retombe sur l'ancien Tooltip au lieu d'ouvrir `RoleInfoPopup`.
2. **`markdownContext` est un singleton mutable** : si l'utilisateur navigue d'un serveur à l'autre sans repasser par `ChatArea`, l'ancien `serverId` reste collé → mauvaises données rôles.
3. **Le filtre `useMemberRoleFilter` est purement en mémoire** : un refresh efface le filtre actif et la bannière "Filtré par @Rôle" dans `MemberList`. À minima, persister par serveur via `sessionStorage` pour rester "instant après refresh" tant qu'on garde l'onglet.

## Changements

### 1. Propager `serverId` partout dans le contexte markdown

- `src/components/threads/ThreadView.tsx` : appeler `setMarkdownContext({ ...getMarkdownContext(), serverId: thread.server_id, currentUserId: user?.id })` dans un `useEffect` au montage / quand `thread.server_id` change. Restaurer le contexte précédent au démontage.
- `src/components/channels/AnnouncementChannel.tsx` : idem avec `channel.server_id` (l'import existe déjà mais n'est jamais appelé).
- `src/components/dm/DMConversation.tsx` : forcer `serverId: undefined` au montage pour éviter qu'un ancien `serverId` collé déclenche `RoleInfoPopup` dans un DM (où il n'y a pas de rôles).

### 2. Maps `roles` / `users` / `channels` dans les surfaces autres que ChatArea

Pour que `RoleMention` ait le nom + la couleur même hors `ChatArea` :

- `ThreadView` et `AnnouncementChannel` : construire les `rolesMap` / `usersMap` / `channelsMap` à partir de `useServerRoles(server_id)` / `useMembers(server_id)` / `useChannels(server_id)` (toutes cache-first), et les pousser via `setMarkdownContext` au même endroit que `serverId`.

### 3. Persister le filtre rôle de `MemberList`

- `src/hooks/useMemberRoleFilter.ts` : ajouter une persistance `sessionStorage` par `serverId` (clé `member-role-filter:<serverId>`) en plus du pub/sub existant. Exporter `getPersistedRoleFilter(serverId)` et `setPersistedRoleFilter(serverId, roleIds)`.
- `src/components/layout/MemberList.tsx` : initialiser l'état des filtres actifs depuis `getPersistedRoleFilter(serverId)` au montage, écrire dans `sessionStorage` à chaque ajout / retrait / clear.

### 4. Forcer un purge cache pour les clients existants

- `src/lib/cache.ts` : passer `CACHE_SCHEMA_VERSION` de `2` à `3`. Chaque client purge memory + localStorage + IndexedDB au prochain chargement, puis warmCache repeuple proprement depuis le serveur — garantit que les anciens caches sans `repliedMessage` ou avec des `rolesMap` partiels soient invalidés.

## Détails techniques

- Pattern `setMarkdownContext({ ...getMarkdownContext(), ... })` déjà utilisé dans `UserProfilePopup`, `DMUserInfoPanel`, `FullUserProfileModal` pour la `variant: 'bio'` → on suit la même convention pour ne pas écraser les autres champs (`onUserClick`, etc.).
- Restauration au démontage : capturer `const prev = getMarkdownContext()` dans le `useEffect`, retourner `() => setMarkdownContext(prev)`.
- `useMemberRoleFilter` reste rétro-compatible : les appelants actuels (`requestMemberRoleFilter`, `useMemberRoleFilterListener`) ne changent pas.
- Aucune migration DB, aucun edge function, aucun changement de schéma — uniquement front + bump de version de cache.

## Fichiers touchés

- `src/lib/markdown.tsx` (aucune modif structurelle, juste vérifié)
- `src/components/threads/ThreadView.tsx`
- `src/components/channels/AnnouncementChannel.tsx`
- `src/components/dm/DMConversation.tsx`
- `src/hooks/useMemberRoleFilter.ts`
- `src/components/layout/MemberList.tsx`
- `src/lib/cache.ts` (bump version)

Aucun fichier auto-généré ni `supabase/config.toml` touché.
