

# Connexion instantanee aux salons vocaux

## Probleme
La connexion a un salon vocal est perceptiblement lente car toutes les operations sont sequentielles : suppression de l'ancien etat vocal, insertion du nouvel etat, connexion WebRTC, puis mise a jour de l'UI. L'utilisateur ne voit le changement qu'apres 2-3 allers-retours reseau.

## Solution
Appliquer un pattern **optimistic update** : mettre a jour l'UI locale immediatement, puis executer les operations DB et WebRTC en arriere-plan.

## Changements

### `src/contexts/VoiceContext.tsx` - Fonction `joinChannel`

1. **UI instantanee** : Appeler `setVoiceState()` et jouer le son `soundEffects.playJoin()` immediatement, avant toute operation asynchrone
2. **Operations paralleles** : Lancer la suppression/insertion DB et la connexion WebRTC en parallele avec `Promise.all` au lieu de les enchainer sequentiellement
3. **Rollback en cas d'erreur** : Sauvegarder l'etat precedent et restaurer en cas d'echec

### `src/contexts/VoiceContext.tsx` - Fonction `leaveChannel`

1. **UI instantanee** : Mettre l'etat a `null` et jouer le son immediatement
2. **Operations en arriere-plan** : Deconnexion WebRTC et suppression DB apres la mise a jour visuelle

### `src/components/layout/ChannelList.tsx`

1. Retirer le `try/catch` bloquant autour de `joinChannel` dans le handler de clic pour ne pas retarder la navigation

### Detail technique

**Avant (sequentiel) :**
```text
[clic] -> delete DB (100ms) -> insert DB (100ms) -> WebRTC connect (200ms) -> setState -> son
Total percu : ~400ms+
```

**Apres (optimistic) :**
```text
[clic] -> setState + son (0ms) -> [DB + WebRTC en parallele, arriere-plan]
Total percu : ~0ms
```

**Pattern de rollback :**
```typescript
const joinChannel = useCallback(async (channelId, channelName, serverName) => {
  const prevState = { ...voiceState };

  // 1. Mise a jour instantanee
  setVoiceState({ channelId, channelName, serverName, isMuted: prevState.isMuted, isDeafened: prevState.isDeafened });
  soundEffects.playJoin();
  toast.success(`Connecte a ${channelName}`);

  // 2. Operations DB + WebRTC en arriere-plan
  try {
    await supabase.from('voice_states').delete().eq('user_id', user.id);
    const [dbResult] = await Promise.all([
      supabase.from('voice_states').insert({ ... }),
      webrtc.connect(channelId),
    ]);
    if (dbResult.error) throw dbResult.error;
    queryClient.invalidateQueries({ queryKey: ['voice-participants'] });
  } catch (error) {
    // 3. Rollback
    setVoiceState(prevState);
    webrtc.disconnect();
    toast.error('Impossible de rejoindre le canal vocal');
  }
});
```

### Fichiers modifies
- `src/contexts/VoiceContext.tsx` (joinChannel + leaveChannel)
- `src/components/layout/ChannelList.tsx` (handler de clic vocal)

