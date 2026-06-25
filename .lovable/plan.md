## Objectif
Liste des serveurs et liste des salons rendues au premier frame, sans flash vide, en s'appuyant sur l'architecture cache-first (IndexedDB + React Query) déjà en place pour les messages/threads.

## Constat actuel
- `useServers` lit déjà `cacheGetSync('servers:<userId>')` via `initialData`. ✅
- `useChannels` lit déjà `cacheGetSync('channels:<serverId>')` via `initialData`. ✅
- Mais au tout premier render après un cold start, `warmCache()` hydrate IDB → mémoire **en arrière-plan** : `cacheGetSync` peut donc retourner `undefined` au mount initial, et la liste reste vide jusqu'au retour réseau.
- Le pont `useCacheRehydrate` couvre déjà `messages:*`, `dm-messages:*`, `thread-messages:*`, `threads:*`, `thread:*`, `url-meta:*` — mais **pas** `servers:*` ni `channels:*`. Conséquence : quand IDB finit d'hydrater, rien ne pousse la donnée dans React Query → on attend la requête réseau.

## Plan

### 1. Étendre le pont `useCacheRehydrate`
Fichier : `src/hooks/useCacheRehydrate.ts`
- Ajouter le routage des clés :
  - `servers:<userId>` → `['servers']` (la queryKey n'inclut pas l'userId côté React Query, mais on n'écrit que si la query est vide, sans risque de cross-user puisque la clé IDB est scopée user).
  - `channels:<serverId>` → `['channels', serverId]`.
- Garder la garde existante "ne pas écraser une donnée fraîche déjà présente".

### 2. Élargir la condition de seed (anti-flash)
Toujours dans `useCacheRehydrate` : pour ces deux clés, autoriser le seed si `existing.data === undefined` **ou** si la donnée actuelle est vide (`[]` pour servers, `{ categories: [], orphanChannels: [] }` pour channels). Cela couvre le cas où `useServers`/`useChannels` ont initialisé avec un fallback vide avant la fin de l'hydratation IDB.

### 3. Précharger les salons de tous les serveurs connus
Aujourd'hui `channels:<serverId>` n'est persisté que lorsque l'utilisateur ouvre le serveur. Pour que le premier clic sur n'importe quel serveur soit instantané :
- Dans `src/hooks/useServers.ts`, après réception de `query.data`, déclencher en arrière-plan un `queryClient.prefetchQuery({ queryKey: ['channels', s.id], queryFn: ... })` pour chaque serveur, **uniquement** si le cache local pour ce serveur est absent ou vide. Throttle simple (max 3 en parallèle) pour ne pas saturer.
- Effet : à chaque ouverture d'app, les salons de tous les serveurs sont en cache mémoire + IDB ; n'importe quelle navigation entre serveurs est rendue synchrone.

### 4. Vérifications
- Confirmer que `warmCache()` notifie bien `servers:*` et `channels:*` (déjà le cas — il itère sur toutes les clés IDB et émet `notifyHydrate`).
- Aucun changement de schéma → pas d'incrément de `CACHE_SCHEMA_VERSION` requis.
- Aucun changement aux mutations/optimistic updates existantes.

## Fichiers modifiés
- `src/hooks/useCacheRehydrate.ts` — ajout du routage `servers:` / `channels:`.
- `src/hooks/useServers.ts` — préchargement des salons en arrière-plan après hydratation de la liste des serveurs.

## Résultat attendu
- Cold start : la liste des serveurs et celle des salons du serveur actif s'affichent au premier frame dès la 2ᵉ visite (cache IDB primé).
- Navigation entre serveurs : zéro latence — la liste des salons est déjà en mémoire grâce au préchargement.
- Aucune régression sur les mutations (drag & drop, création/suppression) qui restent optimistes.