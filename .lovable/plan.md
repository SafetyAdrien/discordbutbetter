

# Optimisation WebRTC : Opus prioritaire + faible latence + adaptabilité bande passante

## Analyse de l'existant

L'implémentation actuelle est déjà solide :
- **Opus SDP** : optimisé à 96kbps, 48kHz, FEC, DTX dans `optimizeSdpForOpus`
- **Audio processing** : RNNoise, high-pass, de-esser, compressor, spectral VAD
- **ICE** : STUN Google + TURN OpenRelay (TCP/UDP)
- **Chiffrement** : DTLS-SRTP actif par défaut (natif WebRTC)

## Lacunes identifiées

1. **Opus n'est pas forcé comme codec prioritaire** — le SDP modifie les paramètres fmtp de payload 111 mais ne réordonne pas la ligne `m=audio` pour placer Opus en premier. Si le navigateur négocie un autre codec, les optimisations sont ignorées.

2. **Aucune adaptation de bande passante** — le bitrate est fixe (96kbps audio, bitrate vidéo statique). Pas de réaction aux variations réseau (perte de paquets, congestion).

3. **Pas de préférence codec vidéo** — VP9 est meilleur pour le screen share (texte net), H264 pour la caméra (accélération matérielle). Actuellement aucune préférence n'est exprimée.

4. **`maxBundlePolicy` et `rtcpMuxPolicy` non configurés** — le bundling réduit la latence en multiplexant audio+vidéo sur un seul transport ICE.

## Changements prévus

### `src/utils/webrtc/PeerConnection.ts`

1. **RTCPeerConnection config** : ajouter `bundlePolicy: 'max-bundle'` et `rtcpMuxPolicy: 'require'` pour réduire la latence (1 seul canal ICE pour tout).

2. **Forcer Opus en priorité dans le SDP** : nouvelle méthode `prioritizeOpusCodec(sdp)` qui réordonne les payloads dans la ligne `m=audio` pour mettre 111 (Opus) en premier.

3. **Adaptation bande passante** : nouvelle méthode `adaptBitrate()` appelée périodiquement, qui lit `getStats()` (packet loss, RTT) et ajuste dynamiquement les encoding parameters des senders :
   - Packet loss > 5% → réduire bitrate audio à 64kbps, activer FEC plus agressif
   - Packet loss > 15% → réduire à 32kbps
   - Packet loss < 2% → remonter à 96kbps
   - Pour la vidéo : ajuster `maxBitrate` et `maxFramerate` proportionnellement

4. **Préférence codec vidéo** : dans `addVideoStream`, utiliser `RTCRtpSender.getCapabilities('video')` pour réordonner les codecs via `setCodecPreferences` :
   - Screen share → VP9 > VP8 > H264
   - Caméra → H264 > VP9 > VP8

5. **Timer d'adaptation** : `startBitrateAdaptation()` / `stopBitrateAdaptation()` avec intervalle de 3s, appelés dans `createOffer`/`close`.

### Fichier unique modifié
- `src/utils/webrtc/PeerConnection.ts`

