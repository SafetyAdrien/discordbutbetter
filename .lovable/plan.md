

# Persistance sessionStorage pour tous les types de données restants

## Constat

En regardant le GIF de référence, les données visibles au chargement incluent les **threads** (avec compteurs, derniers messages, participants) et les **sondages** (avec options et votes). Ces données ne sont pas encore persistées en sessionStorage, ce qui cause un délai visible après F5.

### Hooks déjà persistés (14)
`useServers`, `useChannels`, `useMessages`, `useDMMessages`, `useThreadMessages`, `useMembers`, `useRoles`, `useDMs`, `useNotifications`, `useFriends`, `useUnreadCounts`, `useChannelUnreadCounts`, `useServerUnreadCounts`, `useUserChannelPermissions`

### Hooks à persister (7 fichiers)

| Hook | Cache key | Fichier |
|------|-----------|---------|
| `useThreads` | `cache:threads:{channelId}` | `src/hooks/useThreads.ts` |
| `usePolls` | `cache:polls:channel:{channelId}` | `src/hooks/usePolls.ts` |
| `useThreadPolls` | `cache:polls:thread:{threadId}` | `src/hooks/usePolls.ts` |
| `usePinnedMessages` | `cache:pinned-messages:{channelId}` | `src/hooks/usePinnedMessages.ts` |
| `useDMPinnedMessages` | `cache:dm-pinned-messages:{conversationId}` | `src/hooks/useDMPinnedMessages.ts` |
| `useFollowedThreads` | `cache:followed-threads:{channelId}:{userId}` | `src/hooks/useFollowedThreads.ts` |
| `useUserChannelSettings` | `cache:user-channel-settings:{serverId}:{userId}` | `src/hooks/useUserChannelSettings.ts` |

## Pattern appliqué (identique aux hooks existants)

Chaque `useQuery` reçoit :
1. `placeholderData` qui lit le `sessionStorage`
2. Un `useEffect` qui persiste `query.data` quand ce n'est pas du placeholder

## Preloader — ajout threads + polls

Dans `src/hooks/usePreloader.ts`, après le chargement des messages (phase 2), ajouter en parallèle :

- **Threads** : Pour chaque channel texte chargé, fetch les threads et persister dans sessionStorage
- **Polls** : Pour chaque channel texte chargé, fetch les polls avec options/votes et persister

Ces deux étapes s'exécutent en parallèle avec les messages existants, sans ajouter de loading step visible.

## Fichiers modifiés (7)

1. `src/hooks/useThreads.ts` — `useThreads` + `useThread`
2. `src/hooks/usePolls.ts` — `usePolls` + `useThreadPolls`
3. `src/hooks/usePinnedMessages.ts` — `usePinnedMessages`
4. `src/hooks/useDMPinnedMessages.ts` — `useDMPinnedMessages`
5. `src/hooks/useFollowedThreads.ts` — `useFollowedThreads`
6. `src/hooks/useUserChannelSettings.ts` — `useUserChannelSettings`
7. `src/hooks/usePreloader.ts` — ajout preload threads + polls en background

