## Objectif
Appliquer la même architecture cache-first (zéro latence) aux **threads** (liste + vue ouverte) et aux **aperçus de liens** : tout doit s'afficher instantanément depuis le cache local au premier frame, puis se rafraîchir silencieusement en arrière-plan.

## 1) Fils (Threads)

État actuel :
- `useThreads(channelId)` lit déjà via `placeholderData: cacheGetSync('threads:…')`, mais le **bridge IDB→React Query** (`useCacheRehydrate`) n'écoute QUE `messages:* / dm-messages:* / thread-messages:*` — les listes de threads ne sont jamais réinjectées si la mémoire n'est pas encore hydratée au moment du premier render.
- `useThread(threadId)` (vue détail) n'a **ni placeholderData, ni cache persistant** → chaque ouverture attend le réseau (~300–800 ms de latence visible).
- `ThreadsPopover` affiche un skeleton tant que `isLoading` est vrai, ce qui flashe sur cold-cache.
- `useThreadMessages` est déjà OK (cache + bridge + placeholderData).

Changements :
- **`src/hooks/useCacheRehydrate.ts`** : ajouter le routage des clés `threads:<channelId>` → `['threads', channelId]` et `thread:<threadId>` → `['thread', threadId]`, en gardant la garantie "ne pas écraser de données fraîches".
- **`src/hooks/useThreads.ts`** :
  - `useThread(threadId)` : ajouter `placeholderData: () => cacheGetSync('thread:'+threadId)`, `staleTime: 30_000`, `refetchOnMount` conditionnel, et persister via `cacheSetAsync` quand la donnée vient du réseau.
  - `useThreads` : conserver le comportement actuel ; assouplir `refetchOnMount` pour ne pas rejouer la requête n+1 lourde si du cache est dispo.
- **`src/components/threads/ThreadsPopover.tsx`** : ne plus afficher le skeleton quand on a déjà des données (`threads.length > 0` ou `data !== undefined`) — uniquement quand le cache est réellement vide ET qu'on charge pour la toute première fois.

## 2) Aperçus de liens (Link previews)

État actuel :
- `useUrlMetadata` n'a qu'un `Map` mémoire : tout reload / changement de salon = nouveau fetch via l'edge function `fetch-url-metadata` (latence visible + skeleton qui flashe).
- Aucune persistance IDB, aucun seed synchrone au premier render.

Changements :
- **`src/hooks/useUrlMetadata.ts`** :
  - Au démarrage du hook, lire `cacheGetSync('url-meta:'+url)` pour initialiser `data` ET passer `isLoading=false` si un cache existe (TTL 7 jours, vérifié sur le timestamp stocké).
  - Après un fetch réussi, écrire `cacheSetAsync('url-meta:'+url, { meta, fetchedAt })`.
  - Cache négatif (null) persisté aussi pour éviter de re-tenter en boucle (TTL plus court, 1h).
  - Conserver la dédup `pendingRequests`.
- **`src/hooks/useCacheRehydrate.ts`** : ajouter la route `url-meta:*` pour réinjecter en mémoire dès que IDB hydrate (utile quand le composant LinkEmbed se monte avant que `warmCache` ait terminé).
- **`src/components/chat/LinkEmbed.tsx`** : ne plus afficher le squelette quand `data` est déjà défini (déjà le cas) ; supprimer le `setTimedOut(10s)` qui peut faire reflasher l'embed à vide — remplacer par un simple `if (isLoading && !data) skeleton`.

## Résultat attendu
- Ouverture d'un fil déjà visité : affiché au même frame (titre, créateur, messages) sans skeleton.
- Liste de threads d'un salon déjà visité : visible instantanément à l'ouverture du popover.
- Aperçu d'un lien déjà vu (même URL n'importe où) : rendu complet (titre, image, description, couleur) sans flash skeleton, même après reload F5.
- Premiers chargements (cold) : skeleton uniquement pendant la VRAIE absence de cache, puis remplissage live.

## Détails techniques
- Réutilisation stricte de l'infra existante (`cacheGetSync`, `cacheSetAsync`, `subscribeCacheHydrate`, schema version `CACHE_SCHEMA_VERSION`).
- Aucun changement de schéma DB.
- Aucune modification d'edge function.
- Aucune modification des mutations existantes (create/update/delete thread) — leurs invalidations restent compatibles.
