
Contexte confirmé (tes réponses):  
- Symptôme = **état visuel bloqué**  
- Repro = **partout** (profil, barre vocale, sidebar)  
=> Le problème est centralisé dans la logique d’état de `VoiceContext` (pas un bouton isolé).

Plan de correction (ciblé et robuste):

1) Verrouiller la source de vérité locale (anti “état bloqué”)
- Fichier: `src/contexts/VoiceContext.tsx`
- Dans `toggleMute` et `toggleDeafen`:
  - garder l’optimistic update immédiat (UI + WebRTC),
  - passer sur une logique fonctionnelle pour calculer le prochain état (éviter tout stale state),
  - **ne plus rebasculer visuellement immédiatement** en cas d’échec DB transitoire (sinon effet “bloqué”),
  - afficher un toast d’avertissement + retry silencieux de sync.

2) Corriger la synchro pré-join de façon déterministe
- Fichier: `src/contexts/VoiceContext.tsx`
- Dans `joinChannel`, appliquer systématiquement avant `connect`:
  - `webrtc.setMuted(prevState.isMuted)`
  - `webrtc.setDeafened(prevState.isDeafened)`
- Dans le mode hors salon (pré-mute/pré-casque), appeler aussi les setters WebRTC pour garder le manager aligné même avant connexion.

3) Empêcher l’écrasement de l’état local par la resync DB
- Fichier: `src/contexts/VoiceContext.tsx`
- L’effet de sync `dbVoiceState -> setVoiceState` sera limité:
  - hydrate initiale OK,
  - mais pendant une session vocale active locale, ne pas écraser `isMuted/isDeafened` à chaque refetch.
- Objectif: éviter que l’UI revienne immédiatement à l’ancien état après clic.

4) Durcir la sync backend des toggles
- Fichier: `src/contexts/VoiceContext.tsx`
- Sur update `voice_states`:
  - vérifier explicitement le succès (row effectivement mise à jour),
  - si 0 ligne: tentative de réparation de ligne voix puis retry update,
  - conserver l’optimistic state pendant le retry.

5) Sécuriser la politique UPDATE voix (si blocage persistant côté backend)
- Migration backend:
  - remplacer la policy UPDATE actuelle “restricted” par une version déterministe (éviter la logique `LIMIT 1` ambiguë),
  - conserver l’interdiction de modifier `server_muted`, `server_deafened`, `muted_by` côté client.
- Résultat: plus de faux refus qui re-verrouillent l’UI.

6) Validation E2E (scénarios exacts du bug)
- Cas A: pré-mute -> join -> unmute (doit fonctionner visuellement + audio)
- Cas B: pré-casque -> join -> undeafen (doit fonctionner visuellement + audio)
- Cas C: pré-mute + pré-casque -> join -> toggles dans les 3 zones UI (profil, action bar, sidebar)
- Cas D: vérifier sync temps réel pour les autres participants (états muted/deafened cohérents).
