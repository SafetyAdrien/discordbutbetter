
# Optimisation de l'Instantanéité des Permissions de Salons

## Problème identifié

Lors du changement de serveur ou du chargement initial, l'affichage des salons est retardé par de **multiples requêtes RPC séquentielles** pour vérifier les permissions :

1. **`useChannelsVisibility`** : N requêtes `has_channel_permission` (une par salon) pour `view_channel`
2. **`useVoiceChannelLocks`** : M requêtes `has_channel_permission` (une par salon vocal/stage) pour `connect_voice`
3. **`staleTime: 0`** : Force des refetch constants au lieu de réutiliser le cache

### Impact
- **10+ salons** = **10+ requêtes réseau** parallèles au minimum
- Délai visible avant que les salons s'affichent correctement
- Flash de contenu (tous les salons visibles puis certains disparaissent)

---

## Solution proposée

### Stratégie : Requête RPC groupée + Cache intelligent

Créer une **fonction RPC unique** qui vérifie les permissions de **tous les canaux d'un serveur** en une seule requête, puis utiliser un **staleTime approprié** pour éviter les refetch inutiles.

---

## Modifications

### 1. Nouvelle fonction RPC PostgreSQL

Créer `get_server_channel_permissions` qui retourne les permissions `view_channel` et `connect_voice` pour tous les canaux d'un serveur en une seule requête :

```sql
CREATE OR REPLACE FUNCTION public.get_server_channel_permissions(
  _user_id uuid,
  _server_id uuid
)
RETURNS TABLE(
  channel_id uuid,
  can_view boolean,
  can_connect boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as channel_id,
    has_channel_permission(_user_id, c.id, 'view_channel'::server_permission) as can_view,
    CASE 
      WHEN c.type IN ('voice', 'stage') 
      THEN has_channel_permission(_user_id, c.id, 'connect_voice'::server_permission)
      ELSE true
    END as can_connect
  FROM channels c
  WHERE c.server_id = _server_id;
END;
$$;
```

### 2. Nouveau hook `useServerChannelPermissions`

Remplacer `useChannelsVisibility` et `useVoiceChannelLocks` par un hook unique :

```typescript
// src/hooks/useServerChannelPermissions.ts

export function useServerChannelPermissions(serverId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['server-channel-permissions', serverId, user?.id],
    queryFn: async () => {
      if (!serverId || !user?.id) return { viewable: new Set(), connectable: new Set() };

      const { data, error } = await supabase.rpc('get_server_channel_permissions', {
        _user_id: user.id,
        _server_id: serverId,
      });

      if (error) {
        console.error('Error fetching channel permissions:', error);
        return { viewable: new Set<string>(), connectable: new Set<string>() };
      }

      const viewable = new Set<string>();
      const connectable = new Set<string>();

      (data || []).forEach((row: { channel_id: string; can_view: boolean; can_connect: boolean }) => {
        if (row.can_view) viewable.add(row.channel_id);
        if (row.can_connect) connectable.add(row.channel_id);
      });

      return { viewable, connectable };
    },
    enabled: !!serverId && !!user?.id,
    staleTime: 30000, // Cache 30 secondes (Realtime gère les updates)
    gcTime: 300000,
  });
}
```

### 3. Mise à jour de `usePermissionsRealtime`

Ajouter l'invalidation du nouveau query key :

```typescript
// Dans refetchAllPermissions()
queryClient.invalidateQueries({ queryKey: ['server-channel-permissions'] });
```

### 4. Mise à jour de `ChannelList.tsx`

Remplacer les deux hooks par le nouveau hook unique :

```typescript
// Avant (2 hooks = N+M requêtes)
const { isVisible, isLoading: isVisibilityLoading } = useChannelsVisibility(allChannelIdsForVisibility);
const { isLocked: isVoiceChannelLocked } = useVoiceChannelLocks(voiceChannelIds);

// Après (1 hook = 1 requête)
const { data: channelPerms, isLoading: isPermsLoading } = useServerChannelPermissions(server.id);

const shouldShowChannel = useCallback(
  (channelId: string) => {
    // Pendant le chargement, afficher tous les salons pour éviter le flash
    if (isPermsLoading) return true;
    return channelPerms?.viewable.has(channelId) ?? true;
  },
  [isPermsLoading, channelPerms]
);

const isVoiceChannelLocked = useCallback(
  (channelId: string) => {
    if (isPermsLoading) return false; // Default: pas verrouillé pendant chargement
    return !(channelPerms?.connectable.has(channelId) ?? true);
  },
  [isPermsLoading, channelPerms]
);
```

---

## Flux optimisé

```text
┌─────────────────────────────────────────────────────────────────┐
│                   AVANT : N+M requêtes réseau                   │
├─────────────────────────────────────────────────────────────────┤
│  useChannelsVisibility → has_channel_permission × N salons      │
│  useVoiceChannelLocks  → has_channel_permission × M vocaux      │
│  Total : 10-50+ requêtes parallèles                             │
└─────────────────────────────────────────────────────────────────┘

                              ↓

┌─────────────────────────────────────────────────────────────────┐
│                   APRÈS : 1 requête réseau                      │
├─────────────────────────────────────────────────────────────────┤
│  useServerChannelPermissions                                    │
│  → get_server_channel_permissions (1 appel RPC)                 │
│  → Retourne toutes les permissions view+connect en batch        │
│  → staleTime: 30s évite les refetch inutiles                    │
│  → Realtime invalide le cache si les permissions changent       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Fichiers à modifier

| Fichier | Modifications |
|---------|---------------|
| **Migration SQL** | Créer la fonction `get_server_channel_permissions` |
| `src/hooks/useServerChannelPermissions.ts` | Nouveau hook unique remplaçant visibility + locks |
| `src/hooks/usePermissionsRealtime.ts` | Ajouter invalidation du nouveau query key |
| `src/components/layout/ChannelList.tsx` | Utiliser le nouveau hook au lieu des deux anciens |

---

## Résultat attendu

| Métrique | Avant | Après |
|----------|-------|-------|
| Requêtes réseau | 10-50+ par serveur | **1 par serveur** |
| Temps de réponse | 200-800ms (latence × N) | **~50ms** |
| Flash de contenu | Oui (salons apparaissent/disparaissent) | **Non** |
| Cache | staleTime: 0 (refetch constant) | **30s** (+ Realtime) |

---

## Notes techniques

- La fonction RPC utilise `STABLE` et `SECURITY DEFINER` pour les performances et la sécurité
- Le `staleTime: 30000` est suffisant car les mises à jour de permissions sont gérées par Realtime
- Les permissions `view_channel` et `connect_voice` sont les seules vérifiées au niveau liste (les autres sont vérifiées lors de l'interaction)
- On peut conserver les anciens hooks pour compatibilité avec d'autres composants qui en ont besoin
