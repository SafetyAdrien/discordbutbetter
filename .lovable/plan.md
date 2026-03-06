

# Afficher les threads suivis sur tous les salons du serveur

## Probleme

Actuellement, les threads suivis ne s'affichent que sous le salon actif (`activeChannelId === channel.id`). Quand l'utilisateur change de salon, les threads des autres salons disparaissent.

## Solution

### 1. `src/components/layout/ChannelList.tsx`

**Remplacer** `useFollowedThreads(activeChannelId)` par `useAllFollowedThreadsForServer(server.id)` pour recuperer tous les threads suivis sur le serveur entier.

**Grouper** les threads par `channel_id` dans un `useMemo` :
```ts
const threadsByChannel = useMemo(() => {
  const map: Record<string, ThreadWithUnread[]> = {};
  allFollowedThreads.forEach(thread => {
    if (!map[thread.channel_id]) map[thread.channel_id] = [];
    map[thread.channel_id].push({ ...thread, unreadCount: 0 });
  });
  return map;
}, [allFollowedThreads]);
```

**Modifier** les deux endroits (lignes 1451 et 1519) ou les threads sont passes au composant `ChannelItem` :
- Avant : `threads={activeChannelId === channel.id ? threadsWithUnread : []}`
- Apres : `threads={threadsByChannel[channel.id] || []}`

### 2. Import

Remplacer l'import de `useFollowedThreads` par `useAllFollowedThreadsForServer`.

### 3. Nettoyage

Supprimer les variables `followedThreads` et `threadsWithUnread` devenues inutiles. Le hook `useThreadUnreadCounts` reste en place pour le salon actif (optionnel, amelioration future).

| Fichier | Modification |
|---|---|
| `src/components/layout/ChannelList.tsx` | Remplacer le hook, grouper par channel, passer a tous les salons |

