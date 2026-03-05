

## Problème

Le flash persiste malgré les optimistic updates car **`onSuccess` dans `joinChannel` invalide toutes les queries `voice-participants`** (ligne 138), ce qui déclenche un refetch complet depuis la DB. Ce refetch **écrase momentanément le cache optimiste**. De plus, le callback `subscribe` du realtime (ligne 147 dans `useVoiceParticipants`) fait aussi un `invalidateQueries` au moment de la connexion, créant un second refetch parasite.

Séquence actuelle problématique :
1. `onMutate` → ajoute le participant avec le vrai profil ✓
2. DB insert réussit
3. `onSuccess` → `invalidateQueries(['voice-participants'])` → **refetch** → le cache optimiste est remplacé pendant la transition
4. Realtime INSERT → le handler voit que l'user existe déjà → skip ✓, mais le refetch du point 3 peut arriver entre-temps avec un résultat incomplet

## Solution

### 1. `useVoiceState.ts` — Supprimer l'invalidation des participants dans `onSuccess`

Le cache optimiste (posé dans `onMutate`) + le realtime handler suffisent. L'invalidation large `['voice-participants']` est contre-productive. Ne garder que `['voice-state']`.

```ts
// onSuccess: ne plus invalider voice-participants
onSuccess: ({ channelId, channelName, serverName }) => {
  setVoiceState(prev => ({ ...prev, channelId, channelName, serverName }));
  queryClient.invalidateQueries({ queryKey: ['voice-state'] });
  // PAS de invalidateQueries(['voice-participants']) 
  toast.success(`Connecté à ${channelName}`);
},
```

### 2. `useVoiceParticipants.ts` — Supprimer l'invalidation dans le callback `subscribe`

Le `invalidateQueries` à la ligne 147 déclenche un refetch qui écrase le cache optimiste si la souscription se connecte juste après le join. Le retirer.

```ts
.subscribe((status) => {
  if (status === 'SUBSCRIBED') {
    setIsRealtimeActive(true);
    // Plus de invalidateQueries ici
  }
  ...
});
```

### 3. `useVoiceParticipants.ts` — Merger le realtime INSERT au lieu de skip

Quand l'INSERT arrive pour un user déjà en cache (ajouté par optimistic), mettre à jour son `id` avec le vrai ID DB au lieu de simplement ignorer :

```ts
queryClient.setQueryData(['voice-participants', channelId], (old) => {
  const existing = old?.find(p => p.user_id === newUserId);
  if (existing) {
    // Merge real DB id into optimistic entry
    return old.map(p => p.user_id === newUserId 
      ? { ...p, id: newRow.id, profile: resolvedProfile || p.profile } 
      : p);
  }
  // ... add new participant as before
});
```

### Fichiers à modifier
- **`src/hooks/useVoiceState.ts`** — Retirer `invalidateQueries(['voice-participants'])` de `onSuccess`
- **`src/hooks/useVoiceParticipants.ts`** — Retirer `invalidateQueries` du subscribe callback + merger INSERT au lieu de skip

