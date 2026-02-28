

# Correction de la latence de connexion aux salons vocaux et DM

## Probleme identifie

La connexion a un salon vocal prend trop de temps a cause de plusieurs operations executees en serie au lieu d'etre parallelisees. Voici les goulots d'etranglement :

1. **VoiceContext.joinChannel** : la suppression de l'ancien voice_state (`DELETE`) est faite AVANT le `Promise.all(insert, connect)` -- c'est une requete reseau bloquante inutilement sequentielle
2. **useWebRTC.connect** : `tryStartMicrophone()` est await en premier, ce qui bloque tout le reste (signaling, participants). L'initialisation du micro avec RNNoise peut prendre 200-500ms
3. **useWebRTC.connect** : le demarrage du SignalingService et la requete des participants existants sont faits en serie au lieu d'etre en parallele

## Corrections prevues

### Fichier 1 : `src/contexts/VoiceContext.tsx` (joinChannel)

Fusionner le `DELETE` et le `INSERT + connect` dans un seul `Promise.all` :

```text
Avant :
  await delete(voice_states)       // ~100ms reseau
  await Promise.all([insert, connect])

Apres :
  await Promise.all([
    delete(voice_states).then(() => insert(voice_states)),
    webrtc.connect(channelId)      // demarre immediatement
  ])
```

### Fichier 2 : `src/hooks/useWebRTC.ts` (connect)

Paralleliser les 3 operations d'initialisation qui sont actuellement sequentielles :

```text
Avant (sequentiel) :
  1. await tryStartMicrophone()      // 200-500ms
  2. new SignalingService + start()   // ~100ms
  3. await query participants         // ~100ms
  4. connectToParticipants()
  Total : ~400-700ms

Apres (parallele) :
  const [micSuccess, _, participants] = await Promise.all([
    mediaManager.tryStartMicrophone(),
    signalingService.start(),
    supabase.from('voice_states').select(...)
  ])
  // Puis connecter aux participants
  Total : ~200-500ms (temps de la plus longue operation)
```

Cela reduit le temps de connexion de moitie environ, tout en gardant la meme logique fonctionnelle.

### Fichier 3 : `src/hooks/useDMCallWebRTC.ts` (connect)

Meme optimisation pour les appels DM : paralleliser le demarrage du micro avec la creation de la souscription aux signaux.

## Impact

- Temps de connexion reduit d'environ 50%
- Aucun changement fonctionnel : memes operations, meme resultat
- L'indicateur "Connecte" apparait plus vite

