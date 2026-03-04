

## Plan: Corriger le pré-mute/pré-deafen lors du join vocal

### Problème racine

Dans `VoiceContext.tsx`, la fonction `joinChannel` appelle `webrtc.connect(channelId)` (ligne 292) mais ne synchronise jamais l'état pré-mute/pré-deafen avec le MediaManager. Le `MediaManager.isMuted` reste à `false` par défaut, donc le fix existant à la ligne 153 (`if (this.isMuted)`) ne s'active jamais.

### Correction

**`src/contexts/VoiceContext.tsx`** — dans `joinChannel`, juste AVANT `webrtc.connect(channelId)` (ligne 292), appeler :

```typescript
// Sync pre-mute/deafen state to WebRTC before connecting
if (prevState.isMuted) webrtc.setMuted(true);
if (prevState.isDeafened) webrtc.setDeafened(true);
```

Cela garantit que `MediaManager.isMuted = true` AVANT que `tryStartMicrophone()` ne crée le stream, et le fix existant (lignes 152-157) fonctionnera correctement.

### Fichier modifié
1. `src/contexts/VoiceContext.tsx` — 2 lignes ajoutées avant `webrtc.connect(channelId)`

