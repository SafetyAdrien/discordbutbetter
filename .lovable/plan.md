

## Objectif
Intégrer le système de réactions Discord-like (emojis cliquables avec compteur, picker complet, optimistic updates, realtime) à TOUS les types de messages :
1. **DM** (messages privés 1-à-1 et groupes) — actuellement stub `console.log`
2. **Threads** (fils de discussion) — actuellement stub
3. **Media posts** (channels Media) — aucune réaction
4. **Forum threads** (channels Forum) — aucune réaction (actuellement vide)
5. **Announcement comments** (commentaires sous annonces) — aucune réaction
6. **Voice channel chat** — déjà OK ✅
7. **Server messages textuels** — déjà OK ✅
8. **Announcements** — déjà OK ✅

## Architecture (DB)

Créer 4 nouvelles tables miroirs de `reactions`, avec RLS appropriées :

```sql
-- 1. DM message reactions
CREATE TABLE dm_message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL,  -- references dm_messages.id
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);
-- RLS: Participants can view/add/remove via is_dm_participant on the parent dm_message

-- 2. Thread message reactions  
CREATE TABLE thread_message_reactions (
  id, message_id (→ thread_messages), user_id, emoji, created_at
);
-- RLS: Server members of parent thread channel

-- 3. Media post reactions
CREATE TABLE media_post_reactions (
  id, post_id (→ media_posts), user_id, emoji, created_at
);
-- RLS: Server members of parent channel

-- 4. Announcement comment reactions
CREATE TABLE announcement_comment_reactions (
  id, comment_id (→ announcement_comments), user_id, emoji, created_at
);
-- RLS: Server members
```

Toutes ajoutées à `supabase_realtime` publication.

## Hooks (Frontend)

Créer 4 nouveaux hooks reproduisant le pattern de `useReactions.ts` :
- `src/hooks/useDMReactions.ts` → `useDMMessageReactions` + `useToggleDMReaction`
- `src/hooks/useThreadReactions.ts` → `useThreadMessageReactions` + `useToggleThreadReaction`
- `src/hooks/useMediaReactions.ts` → `useMediaPostReactions` + `useToggleMediaReaction`
- `src/hooks/useCommentReactions.ts` → `useAnnouncementCommentReactions` + `useToggleCommentReaction`

Chacun avec :
- Query batch par `messageIds[]` / `postIds[]`
- Optimistic update instantané (cohérent avec architecture "Universal Instant UI")
- Realtime subscription (1 channel par table)
- Cache IndexedDB via `cacheGetSync`/`cacheSetAsync`

## Composant unifié

Créer `src/components/chat/ReactionBar.tsx` — composant réutilisable affichant :
- Pills emoji groupées avec compteur, highlight si l'utilisateur a réagi
- Bouton "+" qui ouvre `EmojiStickerPicker` (déjà existant)
- Click sur pill = toggle, hover = tooltip avec liste des utilisateurs

Cela remplace les implémentations dupliquées actuelles dans `ChatArea`, `VoiceChannelChat`, `AnnouncementChannel` pour cohérence visuelle.

## Intégrations UI

| Endroit | Fichier | Action |
|---|---|---|
| DM messages | `DMConversation.tsx` | Remplacer `handleAddReaction` stub par `useToggleDMReaction`, afficher `<ReactionBar>` sous chaque message |
| Thread messages | `ThreadView.tsx` | Idem avec `useToggleThreadReaction` |
| Media posts | `MediaChannel.tsx` (+ détail) | Ajouter `<ReactionBar>` sur chaque carte média |
| Forum posts | `ForumChannel.tsx` | Préparer placeholder (forum n'a pas encore de threads réels) |
| Announcement comments | `AnnouncementComments.tsx` | Ajouter `<ReactionBar>` sous chaque commentaire |

## Fichiers modifiés/créés

**Nouveaux** :
- Migration SQL (4 tables + RLS + realtime)
- `src/hooks/useDMReactions.ts`
- `src/hooks/useThreadReactions.ts`
- `src/hooks/useMediaReactions.ts`
- `src/hooks/useCommentReactions.ts`
- `src/components/chat/ReactionBar.tsx`

**Modifiés** :
- `src/components/dm/DMConversation.tsx` — réactions réelles
- `src/components/threads/ThreadView.tsx` — réactions réelles
- `src/components/channels/MediaChannel.tsx` — ReactionBar sur cartes
- `src/components/channels/announcement/AnnouncementComments.tsx` — ReactionBar
- `src/components/chat/ChatArea.tsx` — refactor vers ReactionBar (cohérence)
- `src/components/channels/voice/VoiceChannelChat.tsx` — refactor vers ReactionBar
- `src/components/channels/AnnouncementChannel.tsx` — refactor vers ReactionBar
- `src/components/channels/announcement/AnnouncementReactions.tsx` — utiliser EmojiStickerPicker au lieu de la grille fixe

## Résultat
Réactions emoji uniformes, instantanées et synchronisées en realtime sur **tous** les types de contenu de l'application, avec le picker complet (emojis serveur inclus) accessible partout.

