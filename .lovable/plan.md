

# Correction des bugs vocaux : Mute, Deafen et participant fantôme

## Diagnostic

### Bug 1 : Impossible de se mute
**Cause** : Dans `VoiceControls.tsx` ligne 109, le bouton mute a `disabled={!hasMicrophoneAccess}`. Si le navigateur n'a pas encore accordé l'accès micro (ou l'a refusé), le bouton est grisé. L'utilisateur devrait pouvoir toggler mute même sans accès micro (pour préparer l'état avant d'obtenir l'accès).

### Bug 2 : Détection vocale quand muté
**Cause** : Dans `VoiceContext.tsx` ligne 121, la condition `!voiceState.isMuted` empêche correctement d'ajouter l'utilisateur aux `speakingUsers`. Mais le `localAudioLevel` est toujours mis à jour depuis `webrtc.audioLevel` même quand muté. La barre de niveau audio dans `VoiceControls` est déjà masquée quand muté (ligne 74: `!isMuted`). Cela fonctionne comme prévu.

### Bug 3 : Deafen coupe aussi le micro
**Cause** : `VoiceContext.tsx` lignes 301-304 : `const newMuted = newDeafened && !voiceState.isMuted ? true : undefined`. C'est le comportement Discord standard — deafen implique mute. Mais quand on UN-deafen, le micro devrait se réactiver automatiquement. Actuellement ligne 310 : `isMuted: newMuted ?? prev.isMuted` — quand on un-deafen, `newMuted` est `undefined` donc `isMuted` reste `true`. Le micro reste coupé après un un-deafen. C'est le vrai bug.

### Bug 4 : Participant fantôme après départ
**Cause** : Le `leaveChannel` dans `VoiceContext` (ligne 258-261) fait le delete DB en background APRÈS la mise à jour UI. Le realtime subscription dans `useVoiceParticipants` attend l'événement `DELETE` de la DB pour retirer le participant du cache. Le délai entre la requête DB et la propagation realtime crée le fantôme. Il faut un retrait optimiste immédiat du cache côté local.

## Corrections

### 1. `src/components/layout/VoiceControls.tsx`
- Retirer `disabled={!hasMicrophoneAccess}` du bouton mute — l'utilisateur doit pouvoir toggler l'état mute indépendamment de l'accès micro.

### 2. `src/contexts/VoiceContext.tsx`
- **toggleDeafen** : Quand on un-deafen (`newDeafened = false`), remettre aussi `isMuted` à `false` (sauf si l'utilisateur avait explicitement muté avant de deafen). Stocker un flag `wasMutedBeforeDeafen` pour savoir si on doit restaurer.
- **leaveChannel** : Ajouter un retrait optimiste immédiat du participant du cache `voice-participants` AVANT le delete DB, pour supprimer le fantôme côté local.

### 3. `src/components/dm/DMPage.tsx` et `src/components/mobile/MobileLayout.tsx`
- Ces composants utilisent `useVoiceState()` (le hook standalone) au lieu de `useVoice()` (le contexte). Les mutations `.mutate()` du hook standalone font des appels DB mais ne touchent PAS le WebRTC. Remplacer par `useVoice()` pour une cohérence complète.

## Détail des changements

| Fichier | Modification |
|---|---|
| `VoiceControls.tsx` | Retirer `disabled={!hasMicrophoneAccess}` du bouton mute |
| `VoiceContext.tsx` | Fix un-deafen pour restaurer le micro + retrait optimiste du cache participant au leave |
| `DMPage.tsx` | Remplacer `useVoiceState()` par `useVoice()` |
| `MobileLayout.tsx` | Remplacer `useVoiceState()` par `useVoice()` |

