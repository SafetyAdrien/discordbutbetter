

# Ameliorer la reactivite vocale dans la liste des salons

## Probleme
Les boutons Mute/Deafen et la liste des participants en vocal souffrent de latence car :
1. `toggleMute` et `toggleDeafen` attendent la reponse DB avant de mettre a jour l'UI locale
2. `useVoiceParticipants` fait un refetch complet de la base de donnees a chaque evenement Realtime (INSERT/UPDATE/DELETE) au lieu de mettre a jour le cache directement
3. La souscription Realtime dans `VoiceContext` declenche aussi des `invalidateQueries` redondantes

## Solution
Appliquer le pattern optimistic update partout et utiliser `setQueryData` pour les mises a jour Realtime au lieu de `invalidateQueries`.

## Changements

### 1. `src/contexts/VoiceContext.tsx` - toggleMute et toggleDeafen optimistes

**toggleMute** : Mettre a jour `voiceState`, jouer le son et appeler `webrtc.setMuted()` immediatement, puis faire le `supabase.update()` en arriere-plan avec rollback en cas d'erreur.

**toggleDeafen** : Meme pattern - mise a jour locale instantanee, DB en arriere-plan.

Pour les deux : aussi mettre a jour le cache `voice-participants` de facon optimiste via `setQueryData` pour que la liste des participants (icones mute/deafen) se mette a jour instantanement.

### 2. `src/hooks/useVoiceParticipants.ts` - Realtime avec setQueryData

Remplacer le simple `invalidateQueries` par un traitement intelligent des evenements Realtime :
- **INSERT** : Ajouter le nouveau participant au cache, puis refetch en arriere-plan pour obtenir le profil complet
- **UPDATE** : Mettre a jour les champs (muted, deafened, camera, streaming) directement dans le cache sans refetch
- **DELETE** : Retirer le participant du cache instantanement

Cela elimine le round-trip DB pour chaque changement d'etat (mute/unmute d'un autre participant).

### 3. `src/contexts/VoiceContext.tsx` - Souscription Realtime allegee

La souscription Realtime existante dans VoiceContext (lignes 156-183) appelle deja `invalidateQueries` pour les participants. Avec le changement du point 2, cette invalidation devient redondante. La retirer et ne garder que les effets sonores (join/leave).

### Detail technique

**Pattern toggleMute optimiste :**
```typescript
const toggleMute = useCallback(async () => {
  const newMuted = !voiceState.isMuted;
  
  // 1. UI instantanee
  setVoiceState(prev => ({ ...prev, isMuted: newMuted }));
  webrtc.setMuted(newMuted);
  newMuted ? soundEffects.playMute() : soundEffects.playUnmute();
  
  // 2. Cache participants optimiste
  queryClient.setQueryData(['voice-participants', voiceState.channelId], (old) =>
    old?.map(p => p.user_id === user.id ? { ...p, muted: newMuted } : p)
  );
  
  // 3. DB en arriere-plan
  const { error } = await supabase.from('voice_states')
    .update({ muted: newMuted }).eq('user_id', user.id);
  if (error) {
    // Rollback
    setVoiceState(prev => ({ ...prev, isMuted: !newMuted }));
    webrtc.setMuted(!newMuted);
  }
}, [...]);
```

**Pattern setQueryData Realtime pour useVoiceParticipants :**
```typescript
// Dans le callback Realtime
if (payload.eventType === 'UPDATE') {
  queryClient.setQueryData(['voice-participants', channelId], (old) =>
    old?.map(p => p.user_id === payload.new.user_id
      ? { ...p, muted: payload.new.muted, deafened: payload.new.deafened, ... }
      : p
    )
  );
} else if (payload.eventType === 'DELETE') {
  queryClient.setQueryData(['voice-participants', channelId], (old) =>
    old?.filter(p => p.user_id !== payload.old.user_id)
  );
} else if (payload.eventType === 'INSERT') {
  // Refetch pour avoir le profil complet (JOIN necessaire)
  queryClient.invalidateQueries({ queryKey: ['voice-participants', channelId] });
}
```

### Fichiers modifies
- `src/contexts/VoiceContext.tsx` (toggleMute, toggleDeafen optimistes + retrait invalidation redondante)
- `src/hooks/useVoiceParticipants.ts` (Realtime avec setQueryData)

