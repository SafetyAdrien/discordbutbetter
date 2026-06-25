## Goal
Painter les messages (salons serveur, DMs, threads) **instantanément** au switch ou cold-boot, sans attendre la requête réseau ni l'hydratation IndexedDB.

## Diagnostic
Aujourd'hui, le chemin de chargement message est :

```
main.tsx → await warmCache() (≤1500ms) → render <App/>
useMessages → useCacheReady() → query.enabled = false tant que warmCache n'a pas fini
            → puis placeholderData via cacheGetSync()
```

Le gate `cacheReady` retarde TOUT (la query, donc aussi le `placeholderData`) — au cold boot on perd jusqu'à 1,2 s avant même de peindre le cache local. Au switch de salon, c'est instantané grâce au mirror localStorage, **sauf** si les données n'existent qu'en IndexedDB (gros salons qui dépassent le quota localStorage) : on attend alors la requête réseau (~500 ms - 7 s mesurés).

## Plan

### 1. Découpler "schema purge" de "IDB hydrate" dans `src/lib/cache.ts`
- Rendre `enforceCacheSchemaVersion()` **synchrone** (purge mémoire + localStorage mirror + bump du `CACHE_SCHEMA_VERSION` — l'effacement IDB peut rester en arrière-plan, sans bloquer).
- Appeler cette fonction synchrone tout en haut de `main.tsx` AVANT `createRoot`. Ainsi aucune donnée stale ne peut être lue.
- `markCacheReady()` est appelé **immédiatement** après la purge sync. `warmCache()` continue d'hydrater IDB → mémoire en background.
- Pendant l'hydratation IDB, chaque entrée `messages:*` / `dm-messages:*` / `thread-messages:*` chargée appelle un nouvel hook de "rehydrate broadcast" qui pousse les données dans React Query via `queryClient.setQueryData(key, data)` SI la query existe déjà et est encore vide/placeholder. Cela fait apparaître les messages dès que IDB est lu, sans relancer la requête.

### 2. Retirer le gate `cacheReady` sur les queries messages
Fichiers : `src/hooks/useMessages.ts`, `src/hooks/useDMMessages.ts`, `src/hooks/useThreadMessages.ts`.
- `enabled: !!channelId && !!user` (sans `&& cacheReady`).
- `placeholderData` continue d'utiliser `cacheGetSync` : mémoire (rempli par warmCache), sinon mirror localStorage, sinon `undefined`.
- Conséquence : la query part instantanément, le placeholder peint dans le même tick si dispo.

### 3. Pont IDB → React Query
Dans `cache.ts`, exposer un événement quand `warmCache` hydrate la mémoire. Créer `src/hooks/useCacheRehydrate.ts` monté une fois dans `App` qui, à l'hydratation IDB, pousse les clés `messages:*` / `dm-messages:*` / `thread-messages:*` dans `queryClient` (uniquement si la query existe déjà sans data).

### 4. Garder le gate uniquement pour les écritures cohérentes
La fonction `cacheSetAsync` reste inchangée. `useCacheReady` et `whenCacheReady` restent exportés mais ne sont plus utilisés par les hooks de messages (utiles si un autre flux en a besoin plus tard).

## Résultat attendu
- **Switch de salon avec cache localStorage** : peint au même frame, query background.
- **Switch de salon avec cache uniquement IDB** : peint dès que IDB hydrate (~30-150 ms), pas d'attente réseau.
- **Cold boot premier salon jamais visité** : query part immédiatement (gain ≈ jusqu'à 1,2 s vs aujourd'hui).
- **Cold boot avec cache existant** : placeholder peint immédiatement depuis mirror localStorage, puis IDB rehydrate complète (pour gros volumes) avant même la réponse réseau.

## Fichiers modifiés
- `src/lib/cache.ts` (purge sync + signal d'hydratation IDB par clé)
- `src/main.tsx` (purge schema synchrone avant render)
- `src/hooks/useMessages.ts` (retirer gate)
- `src/hooks/useDMMessages.ts` (retirer gate)
- `src/hooks/useThreadMessages.ts` (retirer gate)
- `src/hooks/useCacheRehydrate.ts` (nouveau — pont IDB→RQ)
- `src/App.tsx` (montage de `useCacheRehydrate`)

Aucun changement DB, aucun changement de logique métier ni d'UI.