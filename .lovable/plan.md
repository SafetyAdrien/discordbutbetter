

## Plan: Paramètres audio avancés, volume micro, icônes caméra/stream, boutons mute/casque dans le profil

### 1. Panneau de paramètres audio avancés (menu contextuel micro)

**Nouveau fichier : `src/components/channels/voice/MicrophoneSettingsPopover.tsx`**
- Popover qui s'ouvre en cliquant sur le ChevronDown du bouton micro (dans VoiceActionBar et VoiceControls)
- Contenu :
  - **Volume du micro** : Slider 0-200% qui contrôle le gain node dans AudioProcessor
  - **Sensibilité VAD** : Sélecteur low/medium/high
  - **Krisp / Noise Suppression** : Sélecteur off/low/high (déplacé ici depuis le bouton séparé)
  - **Filtres** : Toggles pour de-esser, low-shelf boost, high-pass
- Persistance dans localStorage (`voice-mic-volume`, `voice-vad-sensitivity`, etc.)

### 2. Volume du micro fonctionnel (l'utilisateur B entend la différence)

**`src/utils/webrtc/AudioProcessor.ts`**
- Ajouter méthode `setInputGain(volume: number)` qui modifie `gainNode.gain.value` en temps réel
- Le gain node existant (ligne 217) sert de contrôle de volume d'entrée
- Volume 0-200 mappé à gain 0.0-2.0

**`src/contexts/VoiceContext.tsx`**
- Exposer `micVolume: number`, `setMicVolume(vol: number)` dans le contexte
- Persister dans localStorage
- Appeler `audioProcessor.setInputGain()` quand la valeur change

### 3. Icônes caméra et badge "Direct" dans la liste des participants (sidebar)

**`src/components/layout/ChannelList.tsx` (lignes 560-584)**
- Dans le rendu des participants vocaux, ajouter après le nom :
  - Icône `Video` (lucide) si `participant.camera === true`
  - Badge rouge "DIRECT" si `participant.streaming === true`
- Les données `camera` et `streaming` sont déjà dans `voice_states` et mises à jour en temps réel via `useVoiceParticipants`

**`src/contexts/VoiceContext.tsx`**
- Dans `toggleCamera`, ajouter un update optimiste de `voice_states.camera` + sync DB
- Dans `toggleScreenShare`, ajouter un update optimiste de `voice_states.streaming` + sync DB
- Cache update via `queryClient.setQueryData(['voice-participants', channelId])`

### 4. Boutons Mute et Casque dans le UserProfileCard

**`src/components/profile/UserProfileCard.tsx`**
- Ajouter 2 boutons d'action (Mic/MicOff et Headphones/HeadphoneOff) à côté du bouton Settings (ligne 260)
- Importer `useVoice` pour accéder à `toggleMute`, `toggleDeafen`, `voiceState`
- Les boutons fonctionnent même sans être connecté à un salon (pré-mute/pré-deafen)
- Icônes destructive quand actif (même style que VoiceControls)

**`src/contexts/VoiceContext.tsx`**
- Permettre `toggleMute` et `toggleDeafen` même quand `voiceState.channelId === null` (pré-mute)
- Stocker l'état pré-connexion pour l'appliquer au join

### 5. Krisp déplacé dans le menu contextuel du micro

**`src/components/channels/voice/VoiceActionBar.tsx`**
- Retirer le bouton Krisp standalone de la barre
- Le ChevronDown du bouton micro ouvre le `MicrophoneSettingsPopover` qui contient Krisp

**`src/components/layout/VoiceControls.tsx`**
- Retirer le `NoiseSuppressionIndicator` standalone
- Ajouter un ChevronDown au bouton micro qui ouvre le même popover
- Garder un petit indicateur visuel (point vert) sur le bouton micro quand Krisp est actif

### Fichiers à créer
1. `src/components/channels/voice/MicrophoneSettingsPopover.tsx`

### Fichiers à modifier
1. `src/utils/webrtc/AudioProcessor.ts` — méthode `setInputGain()`
2. `src/contexts/VoiceContext.tsx` — micVolume, pré-mute/deafen, camera/streaming sync DB
3. `src/components/channels/voice/VoiceActionBar.tsx` — popover micro, retrait Krisp standalone
4. `src/components/layout/VoiceControls.tsx` — popover micro, retrait NoiseSuppressionIndicator
5. `src/components/layout/ChannelList.tsx` — icônes caméra + badge DIRECT
6. `src/components/profile/UserProfileCard.tsx` — boutons Mute + Casque

