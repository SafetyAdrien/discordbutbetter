
# Amélioration WebRTC vers Qualité Discord

## Analyse de l'implémentation actuelle

### Ce qui est deja en place (solide)
- Architecture WebRTC P2P avec signaling via Supabase Realtime
- Serveurs STUN/TURN (Google STUN + OpenRelay TURN)
- Voice Activity Detection (VAD) basique avec seuil 0.05
- Push-to-Talk fonctionnel
- Gestion camera/screen share
- Statistiques de connexion (latence, jitter, packet loss)
- Sons de notification (join/leave/mute)

### Lacunes identifiees vs Discord
| Fonctionnalite | Discord | Projet actuel |
|----------------|---------|---------------|
| Suppression de bruit (Krisp) | Oui (IA) | Non |
| VAD adaptatif | Seuil dynamique | Seuil fixe (0.05) |
| Indicateur audio temps reel par participant | Barre animee | Seulement speaking ring |
| Reconnexion automatique | Oui | Non |
| Codec Opus optimise | Parametres avances | Parametres navigateur par defaut |
| Qualite adaptative | Bitrate dynamique | Fixe |

---

## Plan d'ameliorations

### Phase 1 : Traitement audio avance

#### 1.1 Classe AudioProcessor avec suppression de bruit

Creer `src/utils/webrtc/AudioProcessor.ts` :

```
AudioProcessor
├── Noise Gate (seuil configurable)
├── Compresseur dynamique
├── Filtres passe-haut (couper < 80Hz)
├── Analyser pour VAD ameliore
└── Option "suppression de bruit" (experimental)
```

**Implementation** :
- Utiliser Web Audio API avec chaine : Source → HighPass → Compressor → GainNode → Destination
- Noise gate : couper quand niveau < seuil pendant X ms
- Compresseur : limiter peaks, normaliser volume

#### 1.2 VAD adaptatif

Remplacer le seuil fixe par un algorithme adaptatif :
- Calculer le niveau de bruit ambiant sur 2-3 secondes
- Ajuster le seuil automatiquement (ambient + 0.1)
- Hysteresis : seuil d'activation > seuil de desactivation

```tsx
// Ancien
const isSpeaking = remoteLevel > 0.05;

// Nouveau
const isSpeaking = remoteLevel > adaptiveThreshold * 1.2;
const stillSpeaking = remoteLevel > adaptiveThreshold * 0.8;
```

---

### Phase 2 : Indicateurs audio en temps reel

#### 2.1 Composant AudioLevelIndicator

Creer un indicateur visuel style Discord pour chaque participant :

```tsx
function AudioLevelIndicator({ level, isSpeaking }) {
  // Barre verticale animee qui pulse avec le niveau audio
  // Couleur : vert quand speaking, gris sinon
}
```

#### 2.2 Integration dans VoiceParticipantGrid

- Afficher une barre de niveau sous/sur l'avatar
- Animation fluide avec `transition-all duration-75`
- Couleur verte pulsante quand speaking

---

### Phase 3 : Robustesse de connexion

#### 3.1 Reconnexion automatique

Modifier `useWebRTC.ts` pour :
- Detecter deconnexion ICE (`failed` state)
- Tenter reconnexion avec backoff exponentiel
- Maximum 3 tentatives avant abandon
- Notification utilisateur du statut

```tsx
useEffect(() => {
  if (iceState === 'failed' && reconnectAttempts < 3) {
    setTimeout(() => {
      reconnect();
      setReconnectAttempts(prev => prev + 1);
    }, Math.pow(2, reconnectAttempts) * 1000);
  }
}, [iceState]);
```

#### 3.2 ICE Restart

Implementer ICE restart pour recuperer sans nouvelle connexion complete :

```tsx
async restartIce(): Promise<void> {
  const offer = await this.pc.createOffer({ iceRestart: true });
  await this.pc.setLocalDescription(offer);
  this.onSignal({ type: 'offer', data: offer });
}
```

---

### Phase 4 : Optimisation codec Opus

#### 4.1 Contraintes audio ameliorees

Modifier `MediaManager.tryStartMicrophone()` :

```tsx
audio: {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  sampleRate: 48000,
  channelCount: 1,
  // Nouveaux parametres
  latency: 0.01, // Basse latence
  sampleSize: 16,
}
```

#### 4.2 Parametres SDP pour Opus

Modifier le SDP avant `setLocalDescription` pour forcer Opus stereo et bitrate :

```tsx
function optimizeSdpForOpus(sdp: string): string {
  // Forcer Opus mono, 48kHz, bitrate 64kbps
  return sdp.replace(
    /a=fmtp:111 /g,
    'a=fmtp:111 stereo=0;maxaveragebitrate=64000;'
  );
}
```

---

### Phase 5 : Qualite adaptative

#### 5.1 Bitrate dynamique base sur qualite reseau

```tsx
// Dans useWebRTC, ajuster le bitrate selon les stats
useEffect(() => {
  if (connectionStats) {
    let targetBitrate = 64000; // 64kbps default
    
    if (connectionStats.packetLoss > 5) {
      targetBitrate = 32000; // Reduire si perte paquets
    } else if (connectionStats.latency < 50 && connectionStats.packetLoss < 1) {
      targetBitrate = 96000; // Augmenter si excellente connexion
    }
    
    adjustBitrate(targetBitrate);
  }
}, [connectionStats]);
```

---

## Fichiers a creer/modifier

| Fichier | Action | Description |
|---------|--------|-------------|
| `src/utils/webrtc/AudioProcessor.ts` | Creer | Classe de traitement audio avance |
| `src/components/channels/voice/AudioLevelIndicator.tsx` | Creer | Indicateur de niveau audio visuel |
| `src/utils/webrtc/MediaManager.ts` | Modifier | Integrer AudioProcessor, contraintes ameliorees |
| `src/utils/webrtc/PeerConnection.ts` | Modifier | ICE restart, optimisation SDP Opus, reconnexion |
| `src/hooks/useWebRTC.ts` | Modifier | Reconnexion auto, qualite adaptative |
| `src/components/channels/voice/VoiceParticipantGrid.tsx` | Modifier | Integrer AudioLevelIndicator |

---

## Architecture finale

```
┌─────────────────────────────────────────────────────┐
│                   VoiceContext                       │
│  ┌─────────────────────────────────────────────────┐│
│  │                 useWebRTC                       ││
│  │  ┌─────────────┐  ┌─────────────┐              ││
│  │  │MediaManager │  │ Reconnexion │              ││
│  │  │             │  │   Manager   │              ││
│  │  │ ┌─────────┐ │  └─────────────┘              ││
│  │  │ │ Audio   │ │                               ││
│  │  │ │Processor│ │  ┌─────────────┐              ││
│  │  │ │- Noise  │ │  │PeerConnection             ││
│  │  │ │  Gate   │ │  │- ICE Restart│              ││
│  │  │ │- Filter │ │  │- Opus SDP   │              ││
│  │  │ │- VAD+   │ │  │- Stats      │              ││
│  │  │ └─────────┘ │  └─────────────┘              ││
│  │  └─────────────┘                               ││
│  └─────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

---

## Priorites d'implementation

1. **Haute** : AudioLevelIndicator (impact visuel immediat)
2. **Haute** : Reconnexion automatique (robustesse critique)
3. **Moyenne** : VAD adaptatif (meilleure detection voix)
4. **Moyenne** : AudioProcessor avec noise gate
5. **Basse** : Optimisation Opus/SDP (amelioration marginale)
6. **Basse** : Bitrate adaptatif (optimisation avancee)

---

## Notes techniques

### Web Audio API pour traitement
```tsx
// Chaine de traitement type
source → highPassFilter (80Hz) → compressor → gainNode → analyser → destination
```

### Suppression de bruit experimentale
La vraie suppression de bruit (style Krisp) necessite du ML. Options :
- RNNoise (WebAssembly) - open source
- Web Neural Network API (experimental)
- Pour l'instant : noise gate + compression suffit

### Performance
- `requestAnimationFrame` pour updates visuels audio
- `setInterval` 50ms pour VAD (existant, bon)
- Eviter recreation AudioContext (singleton)
