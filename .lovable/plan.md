

# Préchargement instantané : ordre des serveurs + permissions par salon

## Problème

1. **Ordre des serveurs** — `useServerOrder` fait un fetch séparé de `profiles.server_order` au montage. Pendant ce temps, la liste des serveurs s'affiche dans l'ordre par défaut puis "saute" quand l'ordre custom arrive.
2. **Permissions par salon** — `useServerChannelPermissions` (appel RPC `get_server_channel_permissions`) se déclenche seulement quand on navigue sur un serveur. Cela provoque un flash où tous les salons sont visibles puis certains disparaissent.

## Solution

Étendre `usePreloader` pour précharger ces deux éléments supplémentaires pendant l'écran de chargement.

### Modifications : `src/hooks/usePreloader.ts`

1. **Ajouter `serverOrderLoaded` et `channelPermsLoaded`** aux states de progression
2. **Précharger `profiles.server_order`** — déjà récupéré dans l'étape profil, mais on doit explicitement alimenter le cache `['server-order', userId]` :
   ```ts
   queryClient.setQueryData(['server-order', user.id], profile?.server_order || []);
   ```
3. **Précharger les permissions par salon pour chaque serveur** — nouvel appel batch après les serveurs :
   ```ts
   const permPromises = serverIds.map(async (sid) => {
     const { data } = await supabase.rpc('get_server_channel_permissions', {
       _user_id: user.id, _server_id: sid
     });
     // Construire les Sets viewable/connectable et alimenter le cache
     queryClient.setQueryData(['server-channel-permissions', sid, user.id], { viewable, connectable });
   });
   ```
4. **Ajouter les 2 nouvelles étapes** dans le tableau `steps` pour la barre de progression

### Modifications : `src/components/LoadingScreen.tsx`

Aucune modification nécessaire — le composant affiche déjà les étapes dynamiquement.

### Fichiers modifiés

| Fichier | Action |
|---|---|
| `src/hooks/usePreloader.ts` | Ajouter préchargement server_order + channel permissions |

