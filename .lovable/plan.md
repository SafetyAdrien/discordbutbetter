## Objectif

Étendre les pastilles rouges "mention" (style Discord) à:
1. Les conversations DM (Desktop `DMList` + Mobile `MobileDMHomeView`).
2. L'icône Inbox / Notifications (Desktop `InboxButton`, Mobile `MobileProfileView` → Bell, et le compteur du header dans `MobileNotificationsView`).

Règle (cohérente avec la mémoire "Notification distinctions"):
- Pastille rouge avec compteur = "mention" (message qui vous est adressé).
- DM 1-on-1: **chaque** message non lu compte comme une mention (la conversation entière vous est adressée).
- Groupe DM: seuls les `<@me>` explicites (UUID ou Snowflake) comptent comme mention; le reste reste un simple "unread".

## 1. Hook `useDMMentionCounts`

Nouveau hook `src/hooks/useDMMentionCounts.ts`:
- Entrée: rien (utilise `useAuth`).
- Fetch:
  - `dm_participants` de l'utilisateur → ids des conversations.
  - `dm_conversations` (champ `is_group`) en batch.
  - `dm_read_states` (last_read_at par conv) en batch.
  - `dm_messages` filtré: `conversation_id IN (...)`, `created_at > min(last_read_at)`, `author_id != me`, limit 2000.
- Calcul en mémoire par conv:
  - 1-on-1: `mentionCount = nombre de messages non lus reçus`.
  - Groupe: ne compter que les messages dont `content` matche `<@(my_uuid)>` ou `<@(my_snowflake)>` (snowflake calculé une fois via `uuidToSnowflake`).
- Souscription Realtime sur `dm_messages` (déjà filtrable côté hook) + `dm_read_states` (invalidate debounce 200ms).
- Cache via `cacheGetSync`/`cacheSetAsync` clé `dm-mention-counts:${user.id}`.
- Retour: `{ mentionCounts: Record<convId, number>, totalMentionCount: number }`.

## 2. Hook agrégé `useTotalMentionCount`

Nouveau `src/hooks/useTotalMentionCount.ts`:
- Combine:
  - `useServerUnreadCounts().unreadInfo` → `sum(info.mentionCount)`.
  - `useDMMentionCounts().totalMentionCount`.
- Retourne `number`.

## 3. Affichage DM list — pastille rouge mention

- **Desktop** `src/components/dm/DMList.tsx`:
  - Récupérer `mentionCounts` via `useDMMentionCounts`.
  - Passer `mentionCount` au `DMListItem`.
  - Remplacer le bloc actuel (badge bg-destructive avec `unreadCount`) par la logique:
    - `mentionCount > 0` → pastille rouge avec `mentionCount` (style identique à `ChannelList` lignes 715-719: `bg-destructive text-destructive-foreground rounded-full text-xs px-1.5 py-0.5`).
    - sinon si `unreadCount > 0` → petit point blanc (style "unread dot" déjà utilisé pour les salons sans mention, cf. mémoire).
- **Mobile** `src/components/mobile/dm/MobileDMHomeView.tsx`:
  - Même hook, même règle d'affichage à l'endroit où le `unreadCount` est rendu.

## 4. Inbox / Notifications — pastille rouge

- **Desktop** `src/components/layout/MemberList.tsx` (`InboxButton` lignes 228-256):
  - Remplacer `unreadCount = notifications.filter(status==='pending').length` par `totalMentionCount = useTotalMentionCount()`.
  - Conserver le Badge `variant="destructive"` mais branché sur `totalMentionCount` (affichage si > 0, "99+" au-delà).
  - Garder éventuellement un point blanc supplémentaire si `unreadCount > 0 && totalMentionCount === 0` (cohérence dot/bubble).
- **Mobile** `src/components/mobile/MobileProfileView.tsx` (bouton Bell lignes 178-188):
  - Remplacer `notifCount` par `useTotalMentionCount()`; même règle.
- **Header `MobileNotificationsView`** lignes 170-172, 299: laisser le label "X non lue" inchangé (il représente l'unread général), mais ajouter à côté un sous-compteur rouge si `totalMentionCount > 0` pour cohérence visuelle.

## 5. Aucune migration DB requise

Tout est dérivé des tables existantes (`dm_messages`, `dm_read_states`, `dm_participants`, `dm_conversations`, `channel_mentions`). Aucune nouvelle table, aucun trigger.

## 6. Vérification

- DM 1-on-1: envoyer un message depuis A vers B → pastille rouge "1" sur la ligne DM (Desktop + Mobile) et incrément du compteur Inbox/Bell.
- Groupe DM: message sans @ → simple point blanc, pas de rouge; message avec `<@B>` → pastille rouge "1".
- Mention serveur (déjà couverte) → continue d'incrémenter le compteur Inbox/Bell global.
- Ouvrir la conversation / le salon → le compteur retombe (déjà géré par `useMarkChannelAsRead` et `useUnreadCounts.markAsRead`).
- `bunx tsc --noEmit`.