## Voie 2 réelle (recréation AudioContext + analyser) + cohérence sélecteur sortie

### Fix A — `setOutputSinkId` : fallback constructeur `AudioContext({ sinkId })`
Dans `src/utils/webrtc/MediaManager.ts::setOutputSinkId`, après la tentative existante `ctx.setSinkId()` :

- Probe one-shot mémorisée sur l'instance : si `AudioContext.prototype.setSinkId` est absente mais que `new AudioContext({ sinkId: '' })` réussit, entrer la branche fallback.
- **Itérer uniquement sur les entrées de `remoteAudioContexts` dont `entry.gainNode !== null`** (chaîne d'amplification effective > 1 active, voie 2 réellement câblée vers `destination`). Les autres entrées sortent par la voie 1 (`<audio>` natif) déjà rerouté par `setSinkId` sur l'élément — leur recréer un contexte serait gratuit et perturberait inutilement l'analyser → indicateur de niveau qui clignote sans raison.

Pour chaque entrée éligible :
1. Capturer **uniquement** `savedGain = entry.gainNode.gain.value` (seul état dynamique runtime ; limiter/saturator sont des constantes pures via `_createLimiter` / `_createSaturator`).
2. Conserver la référence au `MediaStream` distant déjà attaché.
3. `try { newCtx = new AudioContext({ sinkId: this._outputDeviceId, sampleRate: 48000, latencyHint: 'interactive' }) }`. Sur échec : `console.warn`, conserver l'entrée existante, passer à la suivante.
4. Sur succès, recréer **toute la topologie** sur `newCtx`, les deux branches :
   ```text
   newSource   = newCtx.createMediaStreamSource(stream)
   newAnalyser = newCtx.createAnalyser()
   newAnalyser.fftSize = 2048                  // identique L.486
   newAnalyser.smoothingTimeConstant = 0.3     // identique L.487
   newGain     = newCtx.createGain(); newGain.gain.value = savedGain
   newLimiter  = this._createLimiter(newCtx)   // factory pure
   newSaturator= this._createSaturator(newCtx) // factory pure (tanh, oversample '4x')

   newSource.connect(newAnalyser)                                  // branche lecture niveau
   newSource.connect(newGain)
   newGain.connect(newLimiter)
   newLimiter.connect(newSaturator)
   newSaturator.connect(newCtx.destination)                        // branche audible
   ```
   L'analyser est **obligatoire** sinon `getRemoteSpeakingLevel` / `getRemoteFrequencyData` figent l'anneau "qui parle" du pair après changement de sortie.
5. Disconnect propre des anciens nœuds, `await oldContext.close()` sous try/catch, remplacer l'entry dans la `Map` avec la nouvelle structure complète `{ context, analyser, source, gainNode, limiterNode, saturatorNode }`.

Aucun changement à `_createLimiter` / `_createSaturator` ni à `AudioProcessor.ts`.

### Fix B — `outputSinkSupported` en logique ET
Dans `MediaManager.ts`, exposer deux probes statiques mémorisées :
- `canRouteNativeAudioToDevice()` → `'setSinkId' in HTMLMediaElement.prototype`.
- `canRouteWebAudioToDevice()` → vraie si `'setSinkId' in AudioContext.prototype` **OU** si `new AudioContext({ sinkId: '' })` réussit (probe one-shot, contexte fermé immédiatement).

Dans `VoiceContext.tsx` :
- `outputSinkSupported = canRouteNative && canRouteWebAudio` (vérité fonctionnelle complète).
- Ajouter `outputSinkPartial = (canRouteNative || canRouteWebAudio) && !outputSinkSupported`, exposé via le contexte pour permettre un message d'avertissement nuancé dans les popovers.
- Propager les deux flags aux deux popovers (`OutputSettingsPopover` et `HeadphonesSettingsPopover` via `UserProfileCard`).

### Fix C — Brancher la sélection de sortie sur `UserProfileCard`
`src/components/channels/voice/HeadphonesSettingsPopover.tsx` :
- Ajouter props optionnelles : `outputDeviceId?`, `availableOutputs?: MediaDeviceInfo[]`, `onOutputDeviceChange?`, `outputSinkSupported?: boolean`, `outputSinkPartial?: boolean`.
- Si `onOutputDeviceChange` et `availableOutputs` sont fournis, afficher un bloc `Select` "Périphérique de sortie" entre le slider "Volume général" et le bouton "Couper le son" (réplique exacte du bloc d'`OutputSettingsPopover`).
- Sous-ligne d'info : "Ce navigateur ne supporte pas pleinement le changement de sortie audio." si `outputSinkSupported === false`, ou "Certains flux peuvent ignorer ce choix sur ce navigateur." si `outputSinkPartial === true`.

`src/components/profile/UserProfileCard.tsx` :
- Câbler depuis `voiceCtx` : `outputDeviceId`, `availableOutputs`, `onOutputDeviceChange={voiceCtx.setOutputSinkId}`, `outputSinkSupported`, `outputSinkPartial`.

### Hors scope (dette technique, notée)
Duplication `OutputSettingsPopover` (Fix #6) vs `HeadphonesSettingsPopover` (historique) → fusion ultérieure en un seul composant. Pas touché ici pour garder le diff focalisé.

### Diff attendu
- `src/utils/webrtc/MediaManager.ts` : branche fallback `AudioContext({ sinkId })` dans `setOutputSinkId` filtrée sur `gainNode !== null`, recréation des deux branches (analyser + chaîne audible), probes statiques `canRouteNativeAudioToDevice` / `canRouteWebAudioToDevice`.
- `src/contexts/VoiceContext.tsx` : refonte calcul `outputSinkSupported` (ET) + nouveau `outputSinkPartial`, propagation aux popovers.
- `src/components/channels/voice/HeadphonesSettingsPopover.tsx` : nouvelles props optionnelles + bloc sélecteur de sortie + sous-ligne d'info.
- `src/components/profile/UserProfileCard.tsx` : passage des props au popover casque.
- **Non modifiés** : `AudioProcessor.ts`, `_createLimiter`, `_createSaturator`.

### Validation
- Vitest sous `src/utils/webrtc/` : mock `AudioContext` sans `setSinkId` méthode mais acceptant `{ sinkId }` au constructeur. Vérifier :
  - Seules les entrées avec `gainNode !== null` sont recréées (regression guard : entrée sans gainNode → ancienne entry intacte).
  - Topologie reconstruite : 5 `connect()` attendus (`source→analyser`, `source→gain`, `gain→limiter`, `limiter→saturator`, `saturator→destination`).
  - `analyser.fftSize === 2048`, `analyser.smoothingTimeConstant === 0.3`.
  - `gain.gain.value` préservé entre ancien et nouveau contexte.
  - `oldContext.close()` appelé exactement une fois.
- Test des 4 combinaisons natif×webaudio pour `outputSinkSupported` (ET) et `outputSinkPartial`.
- `tsgo --noEmit` clean.
