

# Fix: Audio vocal ne fonctionne qu'à la première connexion

## Causes identifiées

### Bug 1 — Collision de nom de channel Realtime dans SignalingService
`SignalingService.start()` crée un channel Supabase nommé `voice-signals-${channelId}`. Quand on quitte puis rejoint le même salon sans recharger, `stop()` appelle `removeChannel()` puis `start()` recrée un channel avec **le même nom**. Supabase Realtime peut ignorer silencieusement la nouvelle souscription si l'ancienne n'est pas encore totalement détruite côté serveur. Résultat : **aucun signal WebRTC reçu → pas de négociation → pas d'audio**.

### Bug 2 — AudioProcessor jamais nettoyé entre sessions
`MediaManager.cleanup()` appelle `stopMicrophone()` qui stoppe les tracks, mais **n'appelle jamais `audioProcessor.cleanup()`**. Au reconnect, `audioProcessor.processStream()` tente de réutiliser des nœuds internes connectés à un `AudioContext` fermé ou dans un état incohérent. Le `processedStream` est soit silencieux soit ne fonctionne plus.

### Bug 3 — Channel Realtime des événements vocaux sans isolation
Dans `VoiceContext.tsx`, le channel `voice-events:${channelId}` pour les sons join/leave souffre du même problème de collision de nom que le Bug 1.

## Correctifs

### 1. `src/utils/webrtc/SignalingService.ts` — Ajouter un instanceId unique
- Ajouter un `instanceId` (UUID) dans le constructeur
- Utiliser `voice-signals-${channelId}-${instanceId}` comme nom de channel Realtime
- Chaque nouvelle instance de SignalingService aura un nom unique → plus de collision

### 2. `src/utils/webrtc/MediaManager.ts` — Appeler `audioProcessor.cleanup()` dans `cleanup()`
- Ajouter `audioProcessor.cleanup()` dans la méthode `cleanup()` avant de fermer l'audioContext local
- Cela garantit que le processeur audio est complètement réinitialisé entre les sessions

### 3. `src/contexts/VoiceContext.tsx` — Isoler le channel des événements vocaux
- Ajouter un `instanceId` au nom du channel `voice-events:${channelId}-${instanceId}`
- Utiliser un `useRef(crypto.randomUUID())` régénéré à chaque `joinChannel`

### Fichiers modifiés
- `src/utils/webrtc/SignalingService.ts` — instanceId dans le nom du channel
- `src/utils/webrtc/MediaManager.ts` — appel `audioProcessor.cleanup()` dans `cleanup()`
- `src/contexts/VoiceContext.tsx` — isolation du channel d'événements vocaux

