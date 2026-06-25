## Diagnostic

Les hooks `useMessages`, `useThreadMessages`, `useThreads` lisent déjà `placeholderData: cacheGetSync(...)`, donc le code est correct *en théorie*. Mais en pratique tu vois encore de la latence sur les messages de salon et le ThreadSpine. Cause racine probable :

1. **`cacheSetAsync` écrit dans `localStorage`** (le seul layer lisible *synchronement* au boot froid). Les payloads de messages (avec pièces jointes, replied snapshots, etc.) **dépassent fréquemment le quota** localStorage (~5 Mo total), donc le `try/catch` avale silencieusement l'erreur → au render suivant, `cacheGetSync` renvoie `undefined` → placeholder vide → on attend la réponse réseau.
2. **`warmCache:idbHydrate` prend 1.1 – 1.7 s** dans les logs (157 entrées). Pendant ce temps, les queries déjà montées n'ont aucune donnée à afficher ; le `useCacheRehydrate` bridge n'écrit ces clés (`messages:*`, `thread-messages:*`, `threads:*`, `thread:*`) que si `current === undefined`, donc oui ça écrit pendant l'attente — mais l'utilisateur voit quand même 1 à 2 s de vide.
3. **ThreadSpine** dépend de `useThreads(channelId)` ; même problème → spine invisible jusqu'à hydratation.

## Plan

### 1. Snapshot synchrone "hot" en localStorage (boot froid)

`src/lib/cache.ts` :
- Ajouter une **liste de préfixes "hot"** (`messages:`, `thread-messages:`, `threads:`, `thread:`, `channels:`, `servers:`, `dm-messages:`) avec une stratégie de mirror :
  - Cap par valeur : ~80 Ko sérialisé (au-delà on **n'écrit pas** dans le mirror, juste IDB + mémoire).
  - Pour `messages:*` / `thread-messages:*` / `dm-messages:*` : si oversized, écrire un **slim mirror** des **30 derniers messages seulement** sous la même clé (juste pour le boot). La query queryFn ramènera la vraie liste complète en arrière-plan.
- LRU eviction simple : si `setItem` jette `QuotaExceededError`, supprimer les plus anciennes entrées `nexuschat-cache:*` (timestamp stocké à côté) jusqu'à pouvoir réécrire.

### 2. Hydratation IDB priorisée (route active)

`src/lib/cache.ts` :
- Persister `lastChannelId` / `lastServerId` / `lastThreadId` dans `sessionStorage` à chaque navigation (déjà fait pour la nav state — sinon le faire dans `Index.tsx`).
- Dans `warmCache`, faire **3 `store.get(key)` ciblés AVANT le cursor** pour `messages:${lastChannelId}`, `threads:${lastChannelId}`, `thread-messages:${lastThreadId}`. Émettre `emitHydrate` pour ces clés immédiatement (souvent < 50 ms). Le cursor complet continue derrière.

### 3. Bridge : overwriteEmpty pour les listes de messages/threads

`src/hooks/useCacheRehydrate.ts` :
- Passer `allowOverwriteEmpty = true` pour `messages:`, `dm-messages:`, `thread-messages:`, `threads:`, `thread:`. Raison : si `queryFn` a déjà retourné `[]` (échec réseau silencieux, RLS, ou tout simplement pas de données), on autorise le seed depuis IDB. C'est sans risque parce qu'on n'écrase que `[]` ou `undefined`.

### 4. Vérification

- Naviguer entre deux salons connus puis recharger → les messages et le ThreadSpine doivent apparaître **au premier frame** sans skeleton.
- Logs `[perf]` : on doit voir `warmCache:hotKey(...)` < 50 ms et le rendu effectif des messages avant `query:messages(...)` resolve.

## Fichiers modifiés

- `src/lib/cache.ts` (slim mirror + LRU eviction + hot-key prefetch)
- `src/hooks/useCacheRehydrate.ts` (`allowOverwriteEmpty` étendu)
- `src/pages/Index.tsx` (persister `lastChannelId`/`lastThreadId` dans sessionStorage si pas déjà fait)

Aucun changement sur les hooks `useMessages`, `useThreads`, `useThreadMessages` — déjà cache-first. Aucun bump de `CACHE_SCHEMA_VERSION` nécessaire.