

## Plan: Synchroniser l'état mute/deafen entre participants (vocal + appel DM)

### Analyse du problème

Deux problèmes distincts :

**1. Salons vocaux** : L'état mute/deafen est écrit en DB (`voice_states`) et propagé via Realtime. Mais la policy UPDATE utilise une sous-requête auto-référencée soumise au RLS SELECT, ce qui peut provoquer des échecs silencieux. De plus, aucun mécanisme de secours n'existe si le Realtime ne délivre pas l'événement.

**2. Appels DM** : Le `toggleMute` dans `useDMCallWebRTC` (ligne 274) ne fait que `setIsMuted(newMuted)` + `mediaManager.setMuted(newMuted)` localement. **Aucune synchronisation** avec le participant distant. L'autre personne ne peut jamais voir l'icône micro coupé.

### Corrections

#### 1. Simplifier la policy UPDATE de `voice_states` (migration SQL)
- Remplacer la policy WITH CHECK auto-référencée par une policy simple : `USING (auth.uid() = user_id)` / `WITH CHECK (auth.uid() = user_id)`
- Ajouter un **trigger BEFORE UPDATE** qui empêche la modification de `server_muted`, `server_deafened`, `muted_by` par le propriétaire du row (seuls les admins via service role peuvent les modifier)
- Cela élimine le risque d'échec silencieux du subquery RLS

#### 2. Ajouter un polling de secours dans `useVoiceParticipants`
- Fichier : `src/hooks/useVoiceParticipants.ts`
- Changer `refetchInterval` pour toujours rafraîchir lentement (ex: `10000` ms) même quand Realtime fonctionne
- Cela garantit que si un événement Realtime est raté, l'état se corrige en quelques secondes

#### 3. Synchroniser mute/video dans les appels DM via broadcast
- Fichier : `src/hooks/useDMCallWebRTC.ts`
- Utiliser un canal Supabase broadcast (`dm-call-state:${callId}`) pour émettre les changements d'état mute/video
- Dans `toggleMute` : broadcaster `{ type: 'mute-state', userId, isMuted }` après le changement local
- Dans `toggleVideo` : broadcaster `{ type: 'video-state', userId, isVideoOff }` après le changement
- Ajouter un listener broadcast qui met à jour un nouvel état `remoteMuted` et `remoteVideoOff`
- Exposer `remoteMuted` et `remoteVideoOff` dans le return du hook

#### 4. Afficher l'état distant dans `DMCallView`
- Fichier : `src/components/dm/DMCallView.tsx`
- Utiliser `remoteMuted` et `remoteVideoOff` du hook pour afficher une icône micro barré / caméra barrée sur la tuile du participant distant
- Ajouter un indicateur visuel (badge MicOff sur l'avatar distant)

### Fichiers modifiés
1. Migration SQL (policy + trigger `voice_states`)
2. `src/hooks/useVoiceParticipants.ts` (polling backup)
3. `src/hooks/useDMCallWebRTC.ts` (broadcast mute/video)
4. `src/components/dm/DMCallView.tsx` (affichage état distant)

