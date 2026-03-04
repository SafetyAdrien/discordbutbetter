

## Plan: Permissions instantanées au rechargement via cache sessionStorage

### Problème
Actuellement, les permissions sont optimistiquement `true` pendant le chargement (isPending). Résultat : sur CTRL+F5, un salon où l'utilisateur n'a PAS `send_messages` affiche brièvement l'input actif avant de le bloquer. L'utilisateur veut l'inverse : l'input doit être bloqué instantanément.

### Solution
Persister les résultats de permissions dans `sessionStorage` et les utiliser comme `placeholderData` / valeur initiale au lieu du défaut `true`. Ainsi, au rechargement, l'état précédent est restauré immédiatement.

### Changements

**1. `src/hooks/useUserChannelPermissions.ts`**

Ajouter un système de cache sessionStorage dans les hooks principaux :

- **Cache helpers** (en haut du fichier) :
  - `getPermissionCache(key: string)` : lit depuis `sessionStorage`
  - `setPermissionCache(key: string, value: any)` : écrit dans `sessionStorage`

- **`useHasChannelPermission`** :
  - Après fetch réussi, persister le résultat dans sessionStorage (`perm:${channelId}:${permission}`)
  - Au lieu de `query.data ?? (isPending ? true : false)`, utiliser `query.data ?? cachedValue ?? true`
  - Le cache donne la vraie dernière valeur connue ; `true` ne sert que si aucun cache n'existe (premier accès)

- **`useMultipleChannelPermissions`** :
  - Même pattern : chaque permission individuelle est cachée après fetch
  - Le `can()` helper et la map utilisent le cache sessionStorage comme fallback pendant isPending
  - Persister après chaque fetch réussi

- **`useUserChannelPermissions`** :
  - Le `placeholderData` utilise le cache sessionStorage au lieu de `defaultPermissions(true)`
  - Persister le résultat complet après fetch

**2. `src/components/chat/ChatArea.tsx`** (ligne 507)
- Retirer la condition `!permissionsLoading` du `permissionDeniedMessage`
- La logique devient : `(!isAdminOrOwner && !canSendMessages)` directement
- Puisque le cache fournit la bonne valeur dès le départ, pas besoin d'attendre la fin du chargement

**3. `src/components/channels/AnnouncementChannel.tsx`** (ligne 245)
- Même correction : retirer `!permissionsLoading` de la condition

**4. `src/components/threads/ThreadView.tsx`** (ligne 163)
- Déjà correct (pas de guard `permissionsLoading`), mais bénéficiera du cache automatiquement

### Détails techniques

Le cache sessionStorage est choisi car :
- Survit au CTRL+F5 (contrairement au state React)
- Se vide à la fermeture du navigateur (pas de stale data persistante)
- Clé format : `perm:${channelId}:${permission}` pour granularité fine
- Écriture uniquement après fetch réussi (jamais de valeur optimiste en cache)

