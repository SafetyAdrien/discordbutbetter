
Objectif: fiabiliser définitivement le vocal (reconnexions multiples, latence/pertes audio) tout en conservant les interactions participants (clic gauche profil + clic droit mute/volume) déjà en place.

1) Constat rapide
- Les interactions UI demandées sont déjà implémentées (sidebar + grille + menu contextuel + volume optimiste).
- Le bug principal vient surtout de la couche WebRTC/signalisation:
  - Course critique: `leaveChannel()` n’attend pas la fin réelle de `webrtc.disconnect()`, puis `joinChannel()` peut partir trop tôt.
  - `useWebRTC.handleSignalReceived()` ignore certains signaux arrivant avant la création du peer (ICE/answer).
  - Négociation double (glare): les 2 côtés peuvent créer des offers en même temps.
  - Politique DB `voice_signals` trop stricte: le destinataire ne peut pas supprimer les signaux traités.

2) Correctifs backend (migration SQL)
- Fichier migration à ajouter:
  - Remplacer policy DELETE `voice_signals` pour autoriser `from_user_id OR to_user_id`.
  - (Optionnel recommandé) index `created_at` pour cleanup rapide.
- Impact: nettoyage réel des signaux consommés, moins de bruit/stale signaling.

3) Correctifs WebRTC (robustesse reconnexion)
- `src/hooks/useWebRTC.ts`
  - Ajouter un verrou d’opération (connect/disconnect mutex) + promesse en cours.
  - `connect()` attend explicitement une déconnexion active avant de démarrer.
  - `disconnect()` idempotent et atomique.
  - File d’attente des signaux par peer (ICE/answer reçus avant offer).
  - Règle d’initiation déterministe (ex: seul `user.id < peerId` crée l’offer) pour éliminer le glare.
  - Isoler les noms de channels Realtime avec `instanceId` (comme les autres hooks).

4) Correctifs orchestration voice state
- `src/contexts/VoiceContext.tsx`
  - `joinChannel()`:
    - si session active: `await webrtc.disconnect()` avant nouvelle connexion.
    - puis insert DB + `await webrtc.connect(...)` dans un ordre sûr.
  - `leaveChannel()`:
    - `await webrtc.disconnect()` (au lieu de fire-and-forget).
- Résultat: plus de “première connexion OK puis plus rien”.

5) Interactions participants (validation/finitions)
- Vérifier et verrouiller les chemins UI existants:
  - Sidebar (`ChannelList`) et grille (`VoiceParticipantGrid`): clic gauche profil, clic droit menu volume/mute.
  - Conserver optimistic updates via `useVoiceUserSettings` et synchro temps réel déjà en place.
- Ajuster les conflits click/popover si besoin (éviter double ouverture profil+popover sur carte audio-only).

6) Validation E2E stricte (2 comptes, plusieurs cycles)
- Scénarios:
  - Join/leave x10 rapidement sur les 2 comptes.
  - Mute/unmute local pendant reconnections.
  - Réglage volume (0/100/200) + retour audio immédiat.
  - Vérifier absence de signaux bloqués (table `voice_signals` se vide bien après traitement).
- Critère de succès:
  - Audio toujours rétabli après reconnexion.
  - Aucun délai anormal perçu après cycles.
  - UI (profil/menu contextuel) instantanée et cohérente.
