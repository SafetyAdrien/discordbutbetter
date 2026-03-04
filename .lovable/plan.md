

# Fix: Participants fantômes persistants après départ vocal

## Cause racine

Deux problèmes distincts :

### 1. INSERT refetch annule le retrait optimiste
Dans `useVoiceParticipants.ts` ligne 88-90, quand un événement INSERT arrive (quelqu'un rejoint), le code fait `invalidateQueries` qui **refetch tous les participants depuis la DB**. Si le DELETE de l'utilisateur qui vient de partir n'a pas encore été propagé (latence DB ~200-500ms), ce refetch ramène le participant fantôme.

**Fix** : Remplacer `invalidateQueries` par un fetch ciblé du nouveau participant uniquement, puis l'ajouter au cache. Cela n'écrase pas les suppressions optimistes existantes.

### 2. Pas de nettoyage à la fermeture du navigateur
`usePresence.ts` gère le statut utilisateur sur `beforeunload`, mais **aucun nettoyage de `voice_states`** n'est fait. Si l'utilisateur ferme l'onglet sans cliquer "Déconnecter", sa ligne `voice_states` reste en DB indéfiniment → participant fantôme permanent.

**Fix** : Ajouter un `beforeunload` handler dans `VoiceContext.tsx` qui supprime la ligne `voice_states` via `fetch` avec `keepalive: true` (seule méthode fiable sur fermeture d'onglet).

## Modifications

### 1. `src/hooks/useVoiceParticipants.ts`
- Ligne 88-90 : Remplacer `invalidateQueries` par un fetch ciblé du nouveau participant (par `payload.new.user_id`) et l'insérer dans le cache via `setQueryData` sans écraser les suppressions existantes

### 2. `src/contexts/VoiceContext.tsx`  
- Ajouter un `useEffect` avec `beforeunload` listener qui, si `voiceState.channelId` est actif, envoie un `DELETE` via `fetch(..., { keepalive: true })` vers la REST API Supabase pour supprimer la ligne `voice_states` de l'utilisateur
- Ajouter un cleanup dans le `useEffect` return pour le même scénario (démontage du composant)

| Fichier | Modification |
|---|---|
| `useVoiceParticipants.ts` | INSERT : fetch ciblé au lieu de invalidateQueries |
| `VoiceContext.tsx` | beforeunload : nettoyage voice_states sur fermeture onglet |

