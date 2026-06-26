## Plan : Intégration LiveKit Cloud (SDK + connexion)

### Objectif
Préparer l'application à utiliser **LiveKit Cloud** comme stack unique pour l'audio/vidéo : appels DM, salons vocaux/vidéo et stage/live streaming. Cette phase se limite à l'installation du SDK, la génération sécurisée de tokens et la mise en place d'un hook de connexion de base. La stack WebRTC maison (`useWebRTC`, `useDMCallWebRTC`, `useStageWebRTC`) reste en place ; elle sera remplacée dans une phase ultérieure.

### Décisions
- **Hébergement** : LiveKit Cloud (URL + API key + API secret fournis par le dashboard LiveKit).
- **SDK UI** : SDK client bas niveau uniquement, pas `@livekit/components-react`, afin de garder le design maîtrisé.
- **Sécurité** : l'`LIVEKIT_API_SECRET` reste côté backend ; le client appelle une edge function pour obtenir un token JWT signé.

### Étapes

1. **Ajouter les dépendances**
   - `bun add livekit-client`
   - Optionnel : `bun add -D @livekit/protocol` (types)
   - Vérifier que le build Vite et le PWA restent stables (ajustement Workbox si le SDK ajoute un chunk lourd).

2. **Configurer les secrets LiveKit Cloud**
   - Créer via `add_secret` :
     - `LIVEKIT_URL` : l'URL wss du projet Cloud (ex: `wss://xxx.livekit.cloud`).
     - `LIVEKIT_API_KEY` : clé API du projet.
     - `LIVEKIT_API_SECRET` : secret API du projet.
   - Aucune valeur n'est hardcodée dans le code ; le client ne connaît que `LIVEKIT_URL` (public) et obtient le token via edge function.

3. **Créer l'edge function `livekit-token`**
   - Fichier : `supabase/functions/livekit-token/index.ts`.
   - Utilise `livekit-server-sdk` via import `npm:livekit-server-sdk@^...`.
   - Authentifie l'utilisateur avec `getClaims()` sur le header `Authorization`.
   - Endpoint `POST` acceptant `{ room: string, identity: string, name?: string, metadata?: Record<string,unknown> }`.
   - Génère un token JWT avec les droits minimums (`RoomJoin`, `CanPublish`, `CanSubscribe`, `CanPublishData`).
   - Pour les rooms de stage, ajoute `RoomCreate` et `RoomAdmin` aux modérateurs (vérifiés via `user_roles` ou permissions serveur).
   - CORS headers sur toutes les réponses, y compris erreurs.
   - Déployer et tester avec `curl`.

4. **Créer le service client LiveKit**
   - Fichier : `src/lib/livekit.ts`.
   - Fonction `fetchLiveKitToken(roomName, options)` appelant `supabase.functions.invoke('livekit-token')`.
   - Fonction `createLiveKitRoom(url, token)` instanciant `new Room()` avec une configuration adaptée au projet (Opus, redondance, reconnexion auto, etc.).
   - Gestion centralisée des événements : `RoomEvent.Connected`, `Disconnected`, `Reconnecting`, `Reconnected`, `ParticipantConnected`, `ParticipantDisconnected`, `TrackSubscribed`, `TrackUnsubscribed`, `LocalTrackPublished`.

5. **Créer le hook React `useLiveKit`**
   - Fichier : `src/hooks/useLiveKit.ts`.
   - Signature : `useLiveKit(roomName: string, options: { identity: string, name?: string, video?: boolean, audio?: boolean, screenShare?: boolean, metadata?: object })`.
   - Connecte automatiquement au montage, déconnecte au démontage.
   - Expose : `room`, `isConnected`, `isConnecting`, `error`, `participants`, `localParticipant`, `audioTracks`, `videoTracks`, `screenShareTracks`, `toggleMute`, `toggleVideo`, `toggleScreenShare`, `disconnect`.
   - Gère les états d'erreur et de reconnexion avec retour à l'utilisateur.

6. **Créer un composant de test minimal**
   - Fichier : `src/components/livekit/LiveKitConnectionTest.tsx`.
   - Composant autonome qui demande un token, rejoint une room temporaire (`test-<userId>`), affiche le statut de connexion et permet de mute/demute la caméra/micro.
   - Utilisé pour valider la connexion sans toucher aux salons existants.

7. **Validation et nettoyage**
   - `bun run lint` et `bun run build` doivent passer.
   - Vérifier que le PWA build reste sous la limite Workbox (5 Mo actuelle).
   - Tester l'edge function et le composant de test via le preview.
   - S'assurer que les anciens hooks WebRTC ne sont pas cassés par l'ajout de LiveKit.

### Hors scope (phase 2)
- Remplacer `useWebRTC` par une room LiveKit pour les salons vocaux.
- Remplacer `useDMCallWebRTC` par une room privée à 2 participants.
- Remplacer `useStageWebRTC` par une room LiveKit avec rôles speaker/audience.
- Supprimer les tables `voice_signals`, `dm_call_signals`, `voice_states` et la signalisation maison.

### Livrables
- `package.json` mis à jour.
- `supabase/functions/livekit-token/index.ts`.
- `src/lib/livekit.ts`.
- `src/hooks/useLiveKit.ts`.
- `src/components/livekit/LiveKitConnectionTest.tsx`.
- Secrets `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` configurés dans le backend.