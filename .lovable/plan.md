

# Plan: Corrections audio WebRTC + vérification des interactions vocales

## Analyse

### Interactions (clic gauche / clic droit)
Les interactions sont **déjà implémentées** dans la sidebar (`VoiceParticipantsSidebar` lignes 1652-1745) et la grille (`VoiceParticipantGrid`). Clic gauche ouvre le profil, clic droit ouvre le `VoiceParticipantContextMenu` avec mute/volume/profil. Rien à changer ici.

### Bug audio WebRTC — Cause identifiée

**Problème principal** dans `MediaManager.ts` ligne 344 et 590 :
```ts
audio.volume = Math.max(0, Math.min(2, savedVolume / 100));
```
La propriété `HTMLAudioElement.volume` est spec'd pour [0.0, 1.0] seulement. Toute valeur > 1.0 **lève une exception** (`IndexSizeError`) dans certains navigateurs, ce qui **casse la mise en place de l'audio** pour ce peer. Si un utilisateur a un jour réglé le volume à > 100% (le slider va jusqu'à 200%), l'audio est cassé silencieusement.

**Problème secondaire** : pas de mécanisme d'amplification au-delà de 100%. Le slider promet 200% mais le volume natif est capped à 100%. Pour amplifier, il faut un `GainNode` dans le Web Audio API.

**Problème tertiaire** : `AudioContext` peut rester `suspended` si créé sans geste utilisateur, empêchant l'analyse audio (VAD), même si le play() de l'audio element fonctionne.

## Changements

### 1. `src/utils/webrtc/MediaManager.ts` — Fix audio volume + GainNode pour amplification

- Ajouter un `GainNode` par peer dans `addRemoteAudioStream` pour gérer l'amplification > 100%
- Connecter la chaîne : `MediaStreamSource → GainNode → AudioContext.destination` pour les volumes > 100%
- Pour les volumes ≤ 100%, utiliser `audio.volume` natif (plus fiable)
- Dans `setRemoteAudioVolume` : clamp `audio.volume` à `Math.min(1, vol/100)` et utiliser `GainNode.gain.value` pour l'amplification au-delà
- Stocker le GainNode dans une Map `remoteGainNodes`
- S'assurer que l'AudioContext de chaque peer est `resume()` explicitement lors de la création

### 2. `src/utils/webrtc/MediaManager.ts` — Robustifier addRemoteAudioStream

- Wrapper le setup audio dans un try/catch global pour éviter qu'une erreur de volume casse silencieusement tout le flux audio
- Logger les erreurs clairement

### Fichiers modifiés
- **`src/utils/webrtc/MediaManager.ts`** — Fix volume, ajout GainNode, robustesse audio

