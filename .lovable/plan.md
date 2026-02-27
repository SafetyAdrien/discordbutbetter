
# Correction globale du Realtime et des mises a jour instantanees

## Problemes identifies

Apres une analyse approfondie de l'ensemble des hooks (28+ hooks, 24 fichiers avec des subscriptions Realtime), voici les problemes detectes et les corrections necessaires.

---

## Categorie 1 : Subscriptions Realtime multi-tables sur un seul channel

**Probleme** : `useChannels.ts` souscrit a `channels` ET `categories` sur le meme channel Supabase, ce qui peut causer des conflits de bindings ("mismatch between server and client bindings").

**Correction** : Separer en 2 channels distincts, un pour `channels` et un pour `categories`, conformement au pattern deja applique dans `useMembers` et `usePermissionsRealtime`.

**Fichier** : `src/hooks/useChannels.ts`

---

## Categorie 2 : Subscriptions globales sans filtre (performance)

**Probleme** : `useServerUnreadCounts` et `useChannelUnreadCounts` ecoutent la table `messages` globalement (pas de filtre `server_id`). Chaque message envoye dans toute l'app declenche une invalidation pour tous les utilisateurs connectes.

De meme, `poll_votes` dans `usePolls` ecoute globalement sans filtre `poll_id`.

**Correction** : Pas de filtre serveur possible cote Supabase (messages n'a pas `server_id`), mais on peut ajouter un filtrage client-side plus intelligent : verifier que le `channel_id` du message correspond aux channels du serveur avant d'invalider.

**Fichiers** : `src/hooks/useServerUnreadCounts.ts`, `src/hooks/useChannelUnreadCounts.ts`

---

## Categorie 3 : Hooks sans aucune subscription Realtime

**Probleme** : Plusieurs hooks n'ont aucune subscription Realtime, causant un affichage perime jusqu'au prochain refetch :

| Hook | Table | Impact |
|------|-------|--------|
| `usePinnedMessages` | `pinned_messages` | Pin/unpin pas visible par les autres en temps reel |
| `useThreads` | `threads` | Nouveau thread pas visible par les autres |
| `useAnnouncements` | `announcements` | Nouvelles annonces non synchronisees |
| `useAnnouncementComments` | `announcement_comments` | Commentaires non synchronises |
| `useServerSettings` | `server_settings` | Changements de settings non propages |

**Correction** : Ajouter des subscriptions Realtime a chacun de ces hooks avec debounce de 300ms pour coalescence.

**Fichiers** : `src/hooks/usePinnedMessages.ts`, `src/hooks/useThreads.ts`, `src/hooks/useAnnouncements.ts`, `src/hooks/useServerSettings.ts`

---

## Categorie 4 : Reactions sans Realtime

**Probleme** : `useReactions.ts` n'a aucune subscription Realtime. Les reactions ajoutees par d'autres utilisateurs ne sont pas visibles en temps reel.

**Correction** : Ajouter une subscription Realtime sur la table `reactions` dans `useMessageReactions`, avec mise a jour directe du cache via `setQueryData` (pas juste une invalidation, pour eviter un refetch lourd de toutes les reactions).

**Fichier** : `src/hooks/useReactions.ts`

---

## Categorie 5 : Thread messages -- double refetch inutile

**Probleme** : `useThreadMessages` ecoute `event: '*'` et invalide le cache a chaque evenement. Pour un message envoye par l'utilisateur courant, cela cause un refetch inutile car le message est deja present via optimistic update. De plus, `useSendThreadMessage.onSettled` invalide aussi les thread-messages, causant un double refetch.

**Correction** : Filtrer les evenements INSERT de l'utilisateur courant (comme fait dans `useMessages`), et utiliser `setQueryData` pour les messages d'autres utilisateurs au lieu d'invalider.

**Fichier** : `src/hooks/useThreadMessages.ts`

---

## Categorie 6 : `useServerSettings` staleTime trop eleve

**Probleme** : `useServerSettings` a un `staleTime: 5 * 60 * 1000` (5 minutes). Quand un admin change `flexible_channel_names`, les autres admins ne voient pas le changement pendant 5 minutes, meme avec une subscription Realtime.

**Correction** : Reduire le `staleTime` a 30 secondes et ajouter une subscription Realtime pour invalidation immediate.

**Fichier** : `src/hooks/useServerSettings.ts`

---

## Resume des fichiers modifies

| Fichier | Modifications |
|---------|--------------|
| `src/hooks/useChannels.ts` | Separer subscriptions channels/categories en 2 channels distincts |
| `src/hooks/useReactions.ts` | Ajouter subscription Realtime + mise a jour cache directe |
| `src/hooks/useThreadMessages.ts` | Filtrer propres messages, setQueryData au lieu d'invalidation |
| `src/hooks/usePinnedMessages.ts` | Ajouter subscription Realtime sur `pinned_messages` |
| `src/hooks/useThreads.ts` | Ajouter subscription Realtime sur `threads` |
| `src/hooks/useAnnouncements.ts` | Ajouter subscription Realtime sur `announcements` |
| `src/hooks/useServerSettings.ts` | Reduire staleTime + ajouter subscription Realtime |
| `src/hooks/useServerUnreadCounts.ts` | Ajouter filtrage client-side du channel_id |
| `src/hooks/useChannelUnreadCounts.ts` | Ajouter filtrage client-side du channel_id |

---

## Approche technique

Pour chaque hook, le pattern applique sera :

```text
1. useEffect avec serverId/channelId comme dependance
2. supabase.channel('nom-unique-par-scope')
3. .on('postgres_changes', { event, schema, table, filter? })
4. Callback avec :
   - Filtrage client-side si necessaire
   - Debounce 300ms pour coalescence
   - setQueryData pour mise a jour directe OU invalidateQueries pour refetch
5. Cleanup via supabase.removeChannel()
```

Aucune migration de base de donnees n'est necessaire.
