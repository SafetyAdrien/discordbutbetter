

# Temps réel complet + Prefetch/Cache SessionStorage universel

## Analyse

Après audit des 58+ hooks, la majorité ont déjà le temps réel et le prefetch. Voici les lacunes identifiées :

### Hooks manquant le cache SessionStorage (placeholderData + persist)
| Hook | Temps réel | SessionStorage |
|------|-----------|----------------|
| `useServerEmojis` | ✅ | ❌ |
| `useServerStickers` | ✅ | ❌ |
| `useMediaPosts` | ✅ | ❌ |
| `useServerInvites` | ✅ | ❌ |
| `useChannelWebhooks` | ✅ | ❌ |
| `useAuditLogs` | ✅ | ❌ |
| `useChannelUnreadCounts` | ✅ | ❌ |
| `useServerUnreadCounts` | ✅ | ❌ |
| `useThreadUnreadCounts` | ✅ (partiel) | ❌ |
| `useChannelSettings` | ✅ | ❌ |
| `useServerSettings` | ✅ | ❌ |
| `useEngagementStats` | ❌ | ❌ |

### Hooks manquant le temps réel
| Hook | Impact |
|------|--------|
| `useEngagementStats` | Stats serveur pas à jour sans refresh |
| `useThreadUnreadCounts` | Pas de subscription Realtime sur `thread_messages` |

### Preloader — données manquantes
- Émojis et stickers serveur (utilisés dans le picker)
- Pinned messages (déjà fait)
- Channel/server unread counts (partiellement fait via sessionStorage seed)

## Changements

### 1. `src/hooks/useServerAssets.ts`
- Ajouter `placeholderData` + persist sessionStorage pour `useServerEmojis` et `useServerStickers`
- Clés : `cache:server-emojis:{serverId}`, `cache:server-stickers:{serverId}`

### 2. `src/hooks/useMediaPosts.ts`
- Ajouter `placeholderData` + persist sessionStorage
- Clé : `cache:media-posts:{channelId}`

### 3. `src/hooks/useInvites.ts`
- Ajouter `placeholderData` + persist pour `useServerInvites`
- Clé : `cache:invites:{serverId}`

### 4. `src/hooks/useWebhooks.ts`
- Ajouter `placeholderData` + persist pour `useChannelWebhooks`
- Clé : `cache:webhooks:{channelId}`

### 5. `src/hooks/useAuditLogs.ts`
- Ajouter `placeholderData` + persist
- Clé : `cache:audit-logs:{serverId}`

### 6. `src/hooks/useChannelUnreadCounts.ts`
- Ajouter `placeholderData` + persist
- Clé : `cache:channel-unread:{serverId}:{userId}`

### 7. `src/hooks/useServerUnreadCounts.ts`
- Ajouter `placeholderData` + persist
- Clé : `cache:server-unread:{userId}`

### 8. `src/hooks/useThreadUnreadCounts.ts`
- Ajouter `placeholderData` + persist
- Ajouter subscription Realtime sur `thread_messages` pour invalidation automatique
- Clé : `cache:thread-unread:{channelId}:{userId}`

### 9. `src/hooks/useChannelSettings.ts`
- Ajouter `placeholderData` + persist
- Clé : `cache:channel-details:{channelId}`

### 10. `src/hooks/useServerSettings.ts`
- Ajouter `placeholderData` + persist
- Clé : `cache:server-settings:{serverId}`

### 11. `src/hooks/useEngagementStats.ts`
- Ajouter subscription Realtime sur `messages` (INSERT) pour invalidation
- Ajouter `placeholderData` + persist
- Clé : `cache:engagement-stats:{serverId}`

### 12. `src/hooks/usePreloader.ts`
- Ajouter prefetch des émojis et stickers serveur dans le preloader (GROUP parallèle)
- Ajouter prefetch des channel unread counts et server unread counts

### Pattern appliqué uniformément

```ts
// placeholderData from sessionStorage
placeholderData: () => {
  try {
    const cached = sessionStorage.getItem(`cache:KEY`);
    return cached ? JSON.parse(cached) : undefined;
  } catch { return undefined; }
},

// Persist to sessionStorage
useEffect(() => {
  if (query.data && !query.isPlaceholderData) {
    try { sessionStorage.setItem(`cache:KEY`, JSON.stringify(query.data)); } catch {}
  }
}, [query.data, query.isPlaceholderData]);
```

### Fichiers modifiés
- `src/hooks/useServerAssets.ts`
- `src/hooks/useMediaPosts.ts`
- `src/hooks/useInvites.ts`
- `src/hooks/useWebhooks.ts`
- `src/hooks/useAuditLogs.ts`
- `src/hooks/useChannelUnreadCounts.ts`
- `src/hooks/useServerUnreadCounts.ts`
- `src/hooks/useThreadUnreadCounts.ts`
- `src/hooks/useChannelSettings.ts`
- `src/hooks/useServerSettings.ts`
- `src/hooks/useEngagementStats.ts`
- `src/hooks/usePreloader.ts`

