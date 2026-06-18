## Problème identifié

Sur mobile, le chargement « instantané » échoue parce que :

1. **`warmCache()` marque le cache prêt AVANT d'avoir hydraté IndexedDB en mémoire** (`src/lib/cache.ts` lignes 264-307). L'hydratation IDB tourne en arrière-plan et dure ~1s sur smartphone (cf. log `warmCache:idbHydrate(38) = 1039.1ms`).
2. **`useMessages` / `useDMMessages` / `useThreadMessages` lisent leur `placeholderData` via `cacheGetSync()`** au moment où `cacheReady` passe à `true`. Comme IDB n'est pas encore hydraté en mémoire et que le miroir `localStorage` est souvent saturé sur mobile (quota ~5 Mo silencieusement dépassé), le sync read renvoie `undefined` → aucun message affiché instantanément → on attend la requête réseau (`query:messages = 992ms`).
3. **`useMessages` force `staleTime: 0` + `refetchOnMount: 'always'`** : même quand le cache existe, chaque changement de salon repart en réseau, ce qui aggrave la latence ressentie.
4. **`useServers` ne peut pas lire son cache tant que `user` n'est pas résolu** : la première frame de la liste des serveurs est vide. Comme `useAuth` est async, on perd ~1s avant d'afficher la liste, puis `query:servers = 992ms` finit le travail.

## Correctifs

### 1. `src/lib/cache.ts` — attendre l'hydratation IDB avant de libérer `cacheReady`

- Ne plus appeler `markCacheReady()` juste après `enforceCacheSchemaVersion()`.
- Lancer l'hydratation IDB et n'appeler `markCacheReady()` qu'après (`tx.oncomplete`), avec un **plafond de sécurité de 1200 ms** (`setTimeout`) pour ne jamais bloquer l'UI plus longtemps si IDB est lent / cassé.
- Conserver le purge de schéma comme étape bloquante, mais réduire son timeout interne.

Résultat : quand `cacheReady` passe à `true`, le `memoryCache` contient déjà les messages/DM/serveurs/channels du dernier état → les `placeholderData` synchrones renvoient instantanément les données.

### 2. `src/main.tsx` — augmenter le plafond de `warmCache` à 1500 ms

Aligner avec le nouveau plafond IDB (1200 ms + marge). Le shell se rend toujours après, mais on évite le scénario où le shell s'affiche avec un cache vide.

### 3. `src/hooks/useMessages.ts` — supprimer le refetch agressif

- `staleTime: 30_000` (au lieu de 0)
- `refetchOnMount: false` quand `placeholderData` est présent (sinon `'always'`)
- Identique pour `useDMMessages.ts` et `useThreadMessages.ts`.

Le realtime (déjà branché par salon) garde les messages à jour ; on n'a pas besoin de refetch à chaque mount.

### 4. `src/hooks/useServers.ts` — fallback cache sans dépendre de `user`

Lire `servers:<lastUserId>` depuis `localStorage` (clé persistée au login) pour seeder `initialData` même quand `useAuth()` n'a pas encore renvoyé `user`. On stocke `lastUserId` dans `localStorage` à la fin de chaque session authentifiée (déjà dans `AuthContext`, sinon ajout d'une ligne).

### 5. `src/hooks/usePreloader.ts` — précharger les messages du dernier salon depuis IDB en mémoire

Aujourd'hui le preloader ne fait que `queryClient.setQueryData(['messages', targetChannelId], cachedMsgs)` si `cacheGetSync` répond. Avec le correctif n°1 ce read réussira systématiquement, donc aucun changement de code requis ici — juste vérifier que ça fonctionne après les autres correctifs.

## Détails techniques

```text
Avant :
  warmCache.start ──▶ schemaEnforce ──▶ markReady ──▶ (UI render, cache MISS)
                                       └─▶ idbHydrate (1s, background)

Après :
  warmCache.start ──▶ schemaEnforce ──▶ idbHydrate (cap 1200ms) ──▶ markReady ──▶ UI render (cache HIT)
```

Cap 1200 ms : c'est le pire cas observé sur le device de l'utilisateur (1039 ms). On ajoute ~15% de marge. Si IDB casse complètement, on libère quand même à 1200 ms et on retombe sur le comportement actuel (réseau).

## Fichiers modifiés

- `src/lib/cache.ts` — réorganiser `warmCache()` (hydratation bloquante avec timeout)
- `src/main.tsx` — plafond `warmCache` à 1500 ms
- `src/hooks/useMessages.ts` — `staleTime` + `refetchOnMount`
- `src/hooks/useDMMessages.ts` — idem
- `src/hooks/useThreadMessages.ts` — idem
- `src/hooks/useServers.ts` — fallback `lastUserId` pour `initialData`
- `src/contexts/AuthContext.tsx` — persister `lastUserId` à la connexion (si pas déjà fait)

Aucun changement visuel, aucune migration backend.
