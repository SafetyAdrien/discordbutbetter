

# Ajout Realtime + Optimistic Updates manquants sur tous les hooks

## Etat des lieux

Apres audit complet, les salons (channels) et categories de serveur sont **deja bien couverts** : creation, modification, suppression, duplication et reordering ont tous des optimistic updates + realtime. Les lacunes se trouvent dans les hooks peripheriques.

## Ce qui manque

### Hooks sans subscription Realtime (les donnees ne se mettent pas a jour en temps reel)

| Hook | Fichier | Table a ecouter |
|------|---------|-----------------|
| `useDMPinnedMessages` | `useDMPinnedMessages.ts` | `dm_pinned_messages` (filtre `conversation_id`) |
| `useAnnouncementComments` | `useAnnouncements.ts` | `announcement_comments` (filtre `announcement_id`) |
| `useAnnouncementCategories` | `useAnnouncements.ts` | `announcement_categories` (filtre `server_id`) |
| `useAnnouncementReactions` | `useAnnouncements.ts` | `announcement_reactions` (filtre `announcement_id`) |
| `useServerEmojis` | `useServerAssets.ts` | `server_emojis` (filtre `server_id`) |
| `useServerStickers` | `useServerAssets.ts` | `server_stickers` (filtre `server_id`) |
| `useChannelWebhooks` | `useWebhooks.ts` | `webhooks` (filtre `channel_id`) |
| `useServerInvites` | `useInvites.ts` | `invites` (filtre `server_id`) |
| `useChannelDetails` | `useChannelSettings.ts` | `channels` (filtre `id`) |

### Mutations sans optimistic updates (attendent la reponse serveur avant de mettre a jour l'UI)

| Hook | Fichier | Changement |
|------|---------|------------|
| `usePinDMMessage` | `useDMPinnedMessages.ts` | Ajouter onMutate/onError rollback |
| `useUnpinDMMessage` | `useDMPinnedMessages.ts` | Ajouter onMutate/onError rollback |
| `useUploadEmoji` | `useServerAssets.ts` | Ajouter temp item avec blob URL |
| `useUploadSticker` | `useServerAssets.ts` | Ajouter temp item avec blob URL |
| `useUploadServerIcon` | `useServerAssets.ts` | Optimistic sur cache `servers` avec blob URL |
| `useUploadServerBanner` | `useServerAssets.ts` | Optimistic sur cache `servers` avec blob URL |

## Plan d'implementation

### 1. `useDMPinnedMessages.ts`
- Ajouter `useEffect` avec subscription Realtime sur `dm_pinned_messages` filtree par `conversation_id`, debounce 300ms
- `usePinDMMessage` : ajouter `onMutate` (insert temp pinned item dans le cache), `onError` (rollback), garder `onSettled` pour invalidation
- `useUnpinDMMessage` : ajouter `onMutate` (retirer du cache), `onError` (rollback)

### 2. `useAnnouncements.ts`
- `useAnnouncementComments` : ajouter `useEffect` Realtime sur `announcement_comments` filtre par `announcement_id`, debounce 300ms
- `useAnnouncementCategories` : ajouter `useEffect` Realtime sur `announcement_categories` filtre par `server_id`, debounce 300ms
- `useAnnouncementReactions` : ajouter `useEffect` Realtime sur `announcement_reactions` filtre par `announcement_id`, debounce 300ms

### 3. `useServerAssets.ts`
- `useServerEmojis` : ajouter `useEffect` Realtime sur `server_emojis` filtre par `server_id`, debounce 300ms
- `useServerStickers` : ajouter `useEffect` Realtime sur `server_stickers` filtre par `server_id`, debounce 300ms
- `useUploadEmoji` : ajouter `onMutate` avec temp emoji (blob URL via `URL.createObjectURL(file)`), `onError` rollback
- `useUploadSticker` : ajouter `onMutate` avec temp sticker (blob URL), `onError` rollback
- `useUploadServerIcon` : ajouter `onMutate` mettant a jour `icon_url` dans cache `servers` avec blob URL, `onError` rollback
- `useUploadServerBanner` : idem pour `banner_url`

### 4. `useWebhooks.ts`
- `useChannelWebhooks` : ajouter `useEffect` Realtime sur `webhooks` filtre par `channel_id`, debounce 300ms

### 5. `useInvites.ts`
- `useServerInvites` : ajouter `useEffect` Realtime sur `invites` filtre par `server_id`, debounce 300ms

### 6. `useChannelSettings.ts`
- `useChannelDetails` : ajouter `useEffect` Realtime sur `channels` filtre par `id` du channel, debounce 300ms

## Pattern commun applique

Chaque ajout suit le pattern deja etabli dans le codebase :

```text
Realtime:
  useEffect -> supabase.channel('table-rt-${id}')
    -> .on('postgres_changes', { event: '*', schema: 'public', table, filter })
    -> debounce 300ms -> invalidateQueries
  cleanup: removeChannel

Optimistic updates:
  onMutate -> cancelQueries -> snapshot previous -> setQueryData optimistic
  onError -> rollback from context
  onSettled -> invalidateQueries
```

## Fichiers modifies

1. `src/hooks/useDMPinnedMessages.ts`
2. `src/hooks/useAnnouncements.ts`
3. `src/hooks/useServerAssets.ts`
4. `src/hooks/useWebhooks.ts`
5. `src/hooks/useInvites.ts`
6. `src/hooks/useChannelSettings.ts`

