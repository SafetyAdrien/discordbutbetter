

# Correction des bugs vocaux (Mute, Deafen, Participant fantôme)

## Analyse du code actuel

Après inspection complète, voici les problèmes réels :

### Bug 1 : Bouton Mute désactivé dans VoiceActionBar
**Fichier** : `src/components/channels/voice/VoiceActionBar.tsx` ligne 67
**Cause** : `disabled={!hasMicrophoneAccess || !canSpeak}`. Si le micro n'est pas encore accordé, le bouton est grisé. De plus, `VoiceChannelView.tsx` ligne 206 passe `hasMicrophoneAccess={hasMicrophoneAccess && canSpeak}`, doublant la restriction.
**Fix** : Retirer `!hasMicrophoneAccess` du `disabled` dans VoiceActionBar (garder seulement `!canSpeak` comme restriction de permission). L'utilisateur doit pouvoir se mute même sans accès micro.

### Bug 2 : toggleMute/toggleDeafen lancent une exception si channelId est null
**Fichier** : `src/contexts/VoiceContext.tsx` lignes 277 et 308
**Cause** : `if (!user || !voiceState.channelId) throw new Error(...)`. Si le state a un léger délai de synchronisation, le throw empêche le toggle. Comme ce sont des `async` functions, l'exception est silencieuse (unhandled promise rejection).
**Fix** : Remplacer `throw` par un `return` silencieux pour éviter le crash.

### Bug 3 : Deafen — undeafen ne restaure pas le micro
**Fichier** : `src/contexts/VoiceContext.tsx`
**Analyse** : Le code avec `wasMutedBeforeDeafen` semble correct en théorie. MAIS `wasMutedBeforeDeafen` est un `useState` — quand `toggleDeafen` lit sa valeur dans le callback, c'est la valeur au moment du render, pas la valeur actuelle (stale closure). Si `toggleDeafen` est appelé rapidement ou si le composant n'a pas re-rendu, la valeur peut être stale.
**Fix** : Utiliser un `useRef` au lieu de `useState` pour `wasMutedBeforeDeafen`, garantissant une lecture toujours à jour.

### Bug 4 : Participant fantôme après départ
**Fichier** : `src/contexts/VoiceContext.tsx` + `src/hooks/useVoiceParticipants.ts`
**Analyse** : Le retrait optimiste du cache (lignes 259-262) est correct. Cependant, `useVoiceParticipants` a un realtime subscription qui fait un `invalidateQueries` sur INSERT (ligne 89), ce qui re-fetch depuis la DB. Si le DELETE n'est pas encore propagé côté DB quand un autre événement INSERT/UPDATE arrive, le participant "fantôme" réapparaît dans le cache.
**Fix** : Dans `useVoiceParticipants`, sur événement DELETE, vérifier aussi le retrait local immédiat (déjà fait ligne 84). Le vrai problème est que `leaveChannel` dans VoiceContext appelle `queryClient.invalidateQueries` (ligne 273) APRÈS le delete DB, ce qui re-fetch et pourrait réinsérer le participant si le timing est mauvais. Supprimer le `invalidateQueries` pour `voice-participants` dans `leaveChannel` puisque le retrait optimiste + realtime suffisent.

### Bug 5 (bonus) : Index.tsx utilise `useVoiceState()` standalone
**Fichier** : `src/pages/Index.tsx` ligne 195
**Cause** : Le raccourci clavier mute (ligne 216-219) appelle `toggleMute.mutate()` du hook standalone, qui fait un update DB sans toucher au WebRTC. Résultat : le toggle DB est effectué mais le micro n'est pas réellement coupé/réactivé.
**Fix** : Importer `useVoice()` du contexte à la place et utiliser `toggleMute()` du contexte.

## Modifications par fichier

### 1. `src/components/channels/voice/VoiceActionBar.tsx`
- Ligne 67 : Changer `disabled={!hasMicrophoneAccess || !canSpeak}` → `disabled={!canSpeak}` pour le bouton mute

### 2. `src/contexts/VoiceContext.tsx`
- Ligne 69 : Remplacer `useState` par `useRef` pour `wasMutedBeforeDeafen`
- Lignes 277, 308 : Remplacer `throw new Error(...)` par `return` silencieux
- Ligne 273 : Supprimer `queryClient.invalidateQueries({ queryKey: ['voice-participants'] })` dans `leaveChannel` (le retrait optimiste + realtime gèrent tout)

### 3. `src/components/channels/VoiceChannelView.tsx`
- Ligne 206 : Changer `hasMicrophoneAccess={hasMicrophoneAccess && canSpeak}` → `hasMicrophoneAccess={hasMicrophoneAccess}` (la permission `canSpeak` est déjà gérée par le prop `canSpeak`)

### 4. `src/pages/Index.tsx`
- Ligne 31 : Remplacer `import { useVoiceState }` par `import { useVoice }` du contexte
- Ligne 195 : Utiliser `const { voiceState, toggleMute } = useVoice()` 
- Lignes 216-219 : Appeler `toggleMute()` directement (pas `.mutate()`)

| Fichier | Modification |
|---|---|
| `VoiceActionBar.tsx` | Mute button : retirer `disabled` lié au micro |
| `VoiceContext.tsx` | `wasMutedBeforeDeafen` → useRef ; throw → return ; supprimer invalidate inutile |
| `VoiceChannelView.tsx` | Séparer `hasMicrophoneAccess` et `canSpeak` props |
| `Index.tsx` | Utiliser `useVoice()` au lieu de `useVoiceState()` |

