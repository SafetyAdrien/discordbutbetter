## 1. Préchargement de la liste sous le swipe (Mobile)

**Problème**
`AnimatePresence mode="wait"` dans `MobileLayout.tsx` attend la fin de l'animation d'exit de l'overlay (chat / thread) avant de monter l'overlay parent (`channels`). Pendant ce délai, l'écran est vide → "page blanche" pendant la transition.

**Correctif**
- Dans `src/components/mobile/MobileLayout.tsx`:
  - Retirer le `mode="wait"` de l'`AnimatePresence` qui contient thread / chat / channels.
  - Au déclenchement du swipe (handler `onSwipeStart` du hook `useSwipeBack`), monter immédiatement la vue parente (`channels` pour un swipe depuis `chat`, `tab/servers` pour un swipe depuis `channels`) dans une couche dédiée placée derrière l'overlay (z-index inférieur). Cette couche "preview" est rendue dès le `touchstart` et démontée après l'`onfinish` de l'animation.
  - Pour `channels → swipe → tab`, s'assurer que la vue `MobileServersView` reste rendue en arrière-plan (déjà le cas via `activeTab === 'servers'`) — le vrai correctif consiste donc à ne plus bloquer le rendu du parent pendant la sortie.
- Dans `src/hooks/useSwipeBack.ts`: exposer un callback `onSwipeStart` invoqué dès que le lock horizontal est détecté, pour permettre à `MobileLayout` d'allumer le preview.

Résultat: la liste de salons (ou serveurs) est visible sous le doigt avant même le début de la translation, plus aucune frame vide.

## 2. Système de notification / "messages lus" (Mobile + Desktop)

**Problème actuel**
- Le seul marqueur de lecture est `server_read_states` (un `last_read_at` par serveur). `useChannelUnreadCounts` l'utilise pour tous les salons, donc:
  - Marquer un salon = marquer tout le serveur.
  - Ouvrir un salon ne marque PAS automatiquement comme lu (aucun appel à `markAsRead` n'existe lors de l'entrée d'un salon, ni Desktop ni Mobile — celui passé à `ChatArea` provient de `useSummaries`).
- Les pastilles ne disparaissent donc jamais (sauf via "Marquer tout comme lu" dans la sheet mobile).

**Correctif: introduire un read state par salon**

### 2.1 Backend (migration Supabase)
Nouvelle table `channel_read_states`:
```
user_id uuid, channel_id uuid, last_read_at timestamptz
PRIMARY KEY (user_id, channel_id)
```
- `GRANT SELECT, INSERT, UPDATE, DELETE … TO authenticated;` + `GRANT ALL … TO service_role;`
- RLS: `using (auth.uid() = user_id) with check (auth.uid() = user_id)`.
- Index sur `(user_id, channel_id)`.
- `REPLICA IDENTITY FULL` + ajout à la publication `supabase_realtime`.

### 2.2 Hook unifié `useMarkChannelAsRead`
Nouveau hook qui:
1. Upsert `channel_read_states` avec `last_read_at = now()`.
2. Supprime les `channel_mentions` de l'utilisateur sur ce salon.
3. Met à jour optimistiquement les caches `['channel-unread-counts', serverId, userId]` et `['server-unread-counts', userId]` (retire l'entrée du salon, recalcule la pastille serveur).
4. Invalide `['server-unread-counts']` et `['channel-unread-counts', serverId]`.

### 2.3 Mise à jour des hooks de lecture
- `useChannelUnreadCounts` (`src/hooks/useChannelUnreadCounts.ts`): remplacer la lecture d'un `server_read_states` unique par un fetch batch de `channel_read_states` filtré sur `channel_id in (channelIds)`, et calculer `hasUnread` par salon avec son propre `last_read_at` (fallback `epoch`).
- `useServerUnreadCounts` (`src/hooks/useServerUnreadCounts.ts`): même logique d'agrégation, mais en pivotant sur la map `channel → last_read_at`. La pastille serveur s'éteint dès que tous ses salons sont à jour.
- Ajouter une souscription Realtime sur `channel_read_states` (INSERT/UPDATE filtrée par `user_id`) pour invalider les deux query keys, garantissant la synchro multi-onglet/multi-appareil.

### 2.4 Déclenchement automatique
- Desktop `src/components/chat/ChatArea.tsx`: ajouter un `useEffect` dépendant de `channel.id` + du dernier message visible (ou du fait que `messages.length > 0` et qu'on est en bas) → appelle `markChannelAsRead(channel.id)`. Couvre l'ouverture initiale et l'arrivée de nouveaux messages quand on est focus.
- Mobile `src/components/mobile/MobileChatView.tsx`: même `useEffect` dans le composant (avant le rendu de `ChatArea`) avec une garde "vue active".
- `src/components/mobile/MobileChannelListView.tsx` "Marquer tout comme lu": remplacer l'upsert direct par un upsert batch sur `channel_read_states` pour tous les salons du serveur + suppression des mentions (cohérence avec le nouveau modèle). Garder l'upsert de `server_read_states` pour compatibilité tant que `useServerUnreadCounts` ne s'en sert plus.

### 2.5 Compatibilité
- `server_read_states` reste en place mais n'est plus la source de vérité côté unread. Aucune migration des données existantes nécessaire: à la première ouverture d'un salon, sa ligne `channel_read_states` est créée.

## 3. Vérification
- `bunx tsc --noEmit`.
- Test manuel Mobile: ouvrir un salon → la pastille du salon disparaît, la pastille serveur disparaît si plus rien d'autre n'est non lu, swipe back affiche immédiatement la liste sans frame blanche.
- Test manuel Desktop: idem (ouverture salon, mention dans un autre salon → seules les pastilles correspondantes s'allument).