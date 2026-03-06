

# Persistance sessionStorage universelle — tout préchargé instantanément

## Constat

Le preloader charge déjà toutes les données dans le `queryClient`, mais les hooks individuels (`useMembers`, `useRoles`, `useDMs`, `useNotifications`, `useFriends`, etc.) ne lisent pas le `sessionStorage` au démarrage. Résultat : après un F5, chaque hook refait sa requête réseau et affiche un état de chargement le temps que la réponse arrive, même si le preloader va la remplir juste après.

Seuls 6 hooks ont déjà le pattern `placeholderData` + persistance : `useServers`, `useChannels`, `useMessages`, `useDMMessages`, `useThreadMessages`, `useUserChannelPermissions`.

## Plan

Appliquer le même pattern `placeholderData` + `useEffect` persistance à **tous les hooks critiques** qui sont préchargés :

### Hooks à modifier (8 fichiers)

| Hook | Cache key | Fichier |
|------|-----------|---------|
| `useMembers` | `cache:members:{serverId}` | `src/hooks/useMembers.ts` |
| `useServerRoles` | `cache:roles:{serverId}` | `src/hooks/useRoles.ts` |
| `useDMConversations` | `cache:dm-conversations:{userId}` | `src/hooks/useDMs.ts` |
| `useNotifications` | `cache:notifications:{userId}` | `src/hooks/useNotifications.ts` |
| `useFriends` | `cache:friends:{userId}` | `src/hooks/useFriends.ts` |
| `useUnreadCounts` | `cache:unread-counts:{userId}` | `src/hooks/useUnreadCounts.ts` |
| `useChannelUnreadCounts` | `cache:channel-unread:{serverId}:{userId}` | `src/hooks/useChannelUnreadCounts.ts` |
| `useServerUnreadCounts` | `cache:server-unread:{userId}` | `src/hooks/useServerUnreadCounts.ts` |

### Pattern appliqué à chaque hook

```ts
// 1. Dans useQuery config, ajouter :
placeholderData: () => {
  try {
    const cached = sessionStorage.getItem(`cache:KEY`);
    return cached ? JSON.parse(cached) : undefined;
  } catch { return undefined; }
},

// 2. Après useQuery, ajouter :
useEffect(() => {
  if (query.data && id && !query.isPlaceholderData) {
    try {
      sessionStorage.setItem(`cache:KEY`, JSON.stringify(query.data));
    } catch {}
  }
}, [query.data, id, query.isPlaceholderData]);
```

### Preloader — persistance des données manquantes

Le preloader écrit déjà dans sessionStorage pour channels, messages, et profile. Ajouter `writeCache()` pour les groupes qui ne le font pas encore :
- Notifications (nouveau preload step)
- Friends (nouveau preload step)  
- Unread counts (nouveau preload step)
- Server unread counts (nouveau preload step)
- Channel unread counts (nouveau preload step)

Ces 5 nouveaux preloads s'exécuteront en parallèle avec les groupes existants.

### Fichier `src/hooks/usePreloader.ts`

Ajouter dans le bloc parallèle existant :
- **Friends** : `supabase.from('friendships').select(...)` → seed `['friends', userId]` + `writeCache`
- **Notifications** : `supabase.from('server_notifications').select(...)` → seed `['notifications']` + `writeCache`
- **Unread counts** (DM + server + channel) : Requêtes correspondantes avec `writeCache`

Pas de nouveaux states/steps UI nécessaires — ces données secondaires se chargent silencieusement en arrière-plan.

## Impact

Après F5, **aucun** hook ne déclenchera de loading spinner car tous auront des données instantanées depuis sessionStorage via `placeholderData`. Les données fraîches remplaceront silencieusement le cache en arrière-plan.

