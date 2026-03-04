

## Plan: Corriger le déblocage du micro/casque après pré-mute

### Problème racine

Quand l'utilisateur coupe son micro/casque AVANT d'entrer dans un salon, `MediaManager.isMuted` est mis à `true`. Mais quand `tryStartMicrophone()` crée le flux audio en rejoignant le salon, il ne consulte PAS `this.isMuted` pour désactiver les tracks. Les tracks démarrent donc actives (enabled), créant un décalage entre l'état logique (muté) et l'état réel des tracks (non muté). Ensuite, quand l'utilisateur essaie de démuter, `setMuted(false)` met `track.enabled = true` — mais c'était déjà `true`, donc rien ne change visuellement ni fonctionnellement.

### Correction

**`src/utils/webrtc/MediaManager.ts`** — `tryStartMicrophone()` (ligne ~153, avant le `return true`)
- Après la création du stream, appliquer l'état `isMuted` actuel aux tracks :
  ```typescript
  // Apply current mute state to new tracks
  if (this.isMuted && this.localAudioStream) {
    this.localAudioStream.getAudioTracks().forEach(track => {
      track.enabled = false;
    });
  }
  ```

C'est la seule modification nécessaire. Le reste de la logique (toggleMute, toggleDeafen, DB sync) fonctionne déjà correctement — le problème est uniquement que les tracks audio ne reflètent pas l'état muté au moment de leur création.

### Fichier modifié
1. `src/utils/webrtc/MediaManager.ts` — 3 lignes ajoutées dans `tryStartMicrophone()`

