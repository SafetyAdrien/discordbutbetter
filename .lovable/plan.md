

# Fix du préchargement des permissions et membres

## Problèmes identifiés

1. **Clé de cache des rôles incorrecte** : Le preloader écrit dans `['server-roles', sid]` mais `useServerRoles` lit `['roles', serverId]`. Les données préchargées ne sont jamais utilisées.

2. **Clé de cache des membres incorrecte** : Le preloader écrit dans `['members', sid, 'prefetched']` mais `useMembers` lit `['members', serverId]`. Même problème.

3. **Membres sans rôles** : Le preloader fetch les `server_members` avec un `select` simplifié sans le join `member_roles(role:roles(...))`. Résultat : même si la clé était correcte, les membres n'auraient pas leurs rôles, ce qui casse `usePermissions`.

## Plan de correction

### Fichier modifié : `src/hooks/usePreloader.ts`

**A. Corriger la clé de cache des rôles** (étape 4)
- Changer `queryClient.setQueryData(['server-roles', sid], roles)` → `queryClient.setQueryData(['roles', sid], roles)`
- Transformer les données pour inclure les permissions (format `RoleWithPermissions[]`) afin de coller exactement au format attendu par `useServerRoles`.

**B. Corriger le préchargement des membres** (étape 3)
- Utiliser le même `select` que `useMembers` : inclure le join `member_roles(role:roles(...))` et les `server_profiles`
- Écrire dans `['members', sid]` au lieu de `['members', sid, 'prefetched']`
- Transformer les données dans le même format `MemberWithProfile[]` que `useMembers` produit

