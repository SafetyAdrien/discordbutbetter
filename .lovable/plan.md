

# Persistance des messages en sessionStorage

## Objectif
Après un F5, les messages (serveur, DM, threads) s'affichent instantanément depuis le sessionStorage avant même que les requêtes réseau ne soient terminées, exactement comme c'est déjà fait pour les serveurs et les salons.

## Approche
Reproduire le pattern existant (`placeholderData` + `useEffect` de persistance) dans les 3 hooks de messages.

## Fichiers à modifier

### 1. `src/hooks/useMessages.ts`
- Ajouter `placeholderData` au `useQuery` qui lit `sessionStorage.getItem('cache:messages:{channelId}')` et parse le JSON
- Ajouter un `useEffect` qui persiste `query.data` dans `sessionStorage.setItem('cache:messages:{channelId}')` quand les données ne sont pas du placeholder

### 2. `src/hooks/useDMMessages.ts`
- Même pattern avec la clé `cache:dm-messages:{conversationId}`

### 3. `src/hooks/useThreadMessages.ts`
- Même pattern avec la clé `cache:thread-messages:{threadId}`

### 4. `src/hooks/usePreloader.ts`
- Après chaque batch de messages préchargé (steps 7-9), persister aussi dans sessionStorage pour que le prochain F5 ait les données immédiatement sans attendre le preloader

## Pattern exact (appliqué à chaque hook)
```ts
// Dans useQuery config :
placeholderData: () => {
  try {
    const cached = sessionStorage.getItem(`cache:messages:${channelId}`);
    return cached ? JSON.parse(cached) : undefined;
  } catch { return undefined; }
},

// Après useQuery :
useEffect(() => {
  if (query.data && channelId && !query.isPlaceholderData) {
    try {
      sessionStorage.setItem(`cache:messages:${channelId}`, JSON.stringify(query.data));
    } catch { /* quota */ }
  }
}, [query.data, channelId, query.isPlaceholderData]);
```

Et dans le preloader, après chaque `queryClient.setQueryData(...)` :
```ts
try { sessionStorage.setItem(`cache:messages:${chId}`, JSON.stringify(messages)); } catch {}
```

