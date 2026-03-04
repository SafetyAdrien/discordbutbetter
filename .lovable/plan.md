

## Plan: Amélioration audio, sensibilité VAD, partage d'écran avancé et noise suppression

### Contexte actuel
L'infrastructure vocale est déjà bien développée : RNNoise via WASM worklet, spectral VAD, Opus optimization, screen share basique, camera support. Les améliorations portent sur la qualité, la sensibilité et les fonctionnalités manquantes.

---

### 1. Améliorer la qualité audio (serveur vocal + DM)

**`src/utils/webrtc/AudioProcessor.ts`**
- Augmenter le bitrate Opus de 64kbps à 96kbps pour une meilleure fidélité vocale
- Ajouter un filtre de-esser (notch/peaking filter autour de 5-8kHz) pour atténuer les sifflantes
- Ajouter un low-shelf boost léger (+2dB à 200Hz) pour enrichir les voix graves
- Réduire le smoothingTimeConstant de l'analyser de 0.4 à 0.3 pour une réactivité accrue

**`src/utils/webrtc/PeerConnection.ts`**
- Passer `maxaveragebitrate` de 64000 à 96000 dans l'optimisation SDP Opus
- Ajouter `maxplaybackrate=48000` pour forcer le plein spectre
- Ajouter `sprop-maxcapturerate=48000`
- Permettre le stereo pour le partage d'écran audio (`stereo=1` quand trackType === 'screen')

**`src/utils/webrtc/MediaManager.ts`**
- Augmenter la taille FFT de l'analyser local de 2048 à 4096 pour une meilleure résolution fréquentielle
- Appliquer le AudioProcessor aussi sur le flux DM (actuellement seul le serveur vocal l'utilise via MediaManager, mais `useDMCallWebRTC` appelle aussi `mediaManager.tryStartMicrophone()` qui passe déjà par AudioProcessor — valider que c'est le cas)

### 2. Améliorer la sensibilité VAD

**`src/utils/webrtc/AudioProcessor.ts`**
- Baisser `spectralSpeakThreshold` de 0.35 à 0.25 (détection plus sensible)
- Baisser `spectralStopThreshold` de 0.2 à 0.12
- Réduire `SPEAKING_HOLD_MS` de 250ms à 180ms pour un arrêt plus réactif
- Ajouter un mode de sensibilité configurable (low/medium/high) via `updateConfig()`
- Ajouter une pondération exponentielle au lieu de la moyenne simple pour le lissage spectral (les échantillons récents comptent plus)

**`src/utils/webrtc/MediaManager.ts`**
- Pour la VAD remote, baisser les seuils spectraux de 0.3/0.15 à 0.25/0.12
- Réduire `SPEAKING_HOLD_MS` de 200ms à 150ms pour les peers distants

### 3. Partage d'écran avancé avec gestion de qualité

**`src/utils/webrtc/MediaManager.ts` — `startScreenShare()`**
- Accepter un paramètre `options` pour la qualité :
  ```typescript
  interface ScreenShareOptions {
    quality: 'low' | 'medium' | 'high';  // 720p/1080p/1440p
    frameRate: number;                     // 15/30/60
    audio: boolean;                        // system audio
    cursor: 'always' | 'motion' | 'never';
  }
  ```
- Mapper ces options aux contraintes `getDisplayMedia`
- Ajouter `contentHint = 'detail'` sur le video track pour optimiser le codec pour le contenu textuel/écran

**`src/utils/webrtc/PeerConnection.ts`**
- Pour les tracks screen, appliquer des paramètres d'encodage via `sender.setParameters()` :
  - `maxBitrate` : 1.5Mbps (low), 3Mbps (medium), 5Mbps (high)
  - `maxFramerate` selon le choix
  - `degradationPreference: 'maintain-resolution'` pour les écrans

**`src/hooks/useWebRTC.ts` — `startScreenShare()`**
- Propager les options de qualité depuis le contexte
- Appliquer les encoding parameters sur le RTCRtpSender

**`src/contexts/VoiceContext.tsx`**
- Ajouter `screenShareQuality` au state et exposer `setScreenShareQuality`
- Passer les options à `webrtc.startScreenShare(options)`

**Nouveau composant : `src/components/channels/voice/ScreenShareQualityModal.tsx`**
- Modal avec choix de qualité (Fluide 720p/15fps, Meilleure 1080p/30fps, Source 1440p/60fps)
- Toggle pour audio système
- Toggle pour curseur
- S'affiche avant le lancement du partage d'écran

**`src/components/channels/voice/VoiceActionBar.tsx`**
- Le bouton Screen Share ouvre d'abord le ScreenShareQualityModal au lieu de lancer directement

### 4. Noise suppression et "Krisp"

L'intégration RNNoise est déjà en place dans `AudioProcessor.ts`. Améliorations :

**`src/utils/webrtc/AudioProcessor.ts`**
- Ajouter un mode de suppression configurable : `off`, `low`, `high`
  - `off` : bypass le node RNNoise
  - `low` : RNNoise actif mais gain de sortie à 0.85 (atténue moins)
  - `high` : RNNoise actif + noise gate agressif (seuil plus haut)
- Ajouter une méthode `setNoiseSuppression(mode)` qui modifie la chaîne en temps réel sans recréer le stream
- Ajouter un état `rnnoiseAvailable` public pour l'UI

**Nouveau composant : `src/components/channels/voice/NoiseSuppressionIndicator.tsx`**
- Petit badge dans le VoiceControls sidebar montrant si Krisp est actif
- Clic toggle entre off/low/high avec icône animée

**`src/components/layout/VoiceControls.tsx`**
- Ajouter le `NoiseSuppressionIndicator` dans la barre de contrôles
- Ajouter un bouton dédié Krisp (icône shield/wave) à côté du PTT

**`src/contexts/VoiceContext.tsx`**
- Exposer `noiseSuppression: 'off' | 'low' | 'high'` et `setNoiseSuppression()`
- Persister le choix dans localStorage

---

### Fichiers à créer
1. `src/components/channels/voice/ScreenShareQualityModal.tsx`
2. `src/components/channels/voice/NoiseSuppressionIndicator.tsx`

### Fichiers à modifier
1. `src/utils/webrtc/AudioProcessor.ts` — qualité audio + VAD sensibilité + noise suppression modes
2. `src/utils/webrtc/PeerConnection.ts` — bitrate Opus + encoding params screen share
3. `src/utils/webrtc/MediaManager.ts` — screen share options + VAD seuils + analyser FFT
4. `src/hooks/useWebRTC.ts` — screen share quality options + encoding params
5. `src/contexts/VoiceContext.tsx` — screen share quality + noise suppression state
6. `src/components/channels/voice/VoiceActionBar.tsx` — screen share modal trigger + krisp button
7. `src/components/layout/VoiceControls.tsx` — noise suppression indicator

