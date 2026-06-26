# Audit chargement sidebar — bilan détaillé

## 1. Liste des serveurs (`useServers` + `useServerOrder` + `ServerList`)

**Bon :**
- Données stockées dans un **tableau** (`ServerWithDetails[]`), pas un objet → pas de tri implicite par clé JS.
- L'ordre custom est **persistant en base** : colonne `profiles.server_order` (UUID[]), lue/écrite via `useServerOrder` avec optimistic update + rollback.
- Cache IndexedDB + React Query hydratés en cold-start, prefetch en arrière-plan des `channels` de chaque serveur (3 en parallèle).
- Realtime UPDATE/INSERT/DELETE sur `servers` patché en cache (pas d'invalidation lourde).

**Problèmes confirmés :**
- **a.** La requête `useServers` n'a **aucun `order()` explicite**. Donc l'ordre arrivé du serveur est non déterministe. Tant que `server_order` couvre tous les IDs c'est invisible, mais dès qu'un serveur est rejoint et pas encore présent dans `server_order`, sa position est aléatoire entre fetches (sortServers le met "à la fin" via `Infinity`, mais l'ordre entre nouveaux serveurs varie).
- **b.** `useServerOrder` charge l'ordre via une **2e requête réseau séparée** (`select server_order from profiles`) alors que `AuthContext` charge déjà le profil complet. → Sidebar potentiellement re-triée après le 1er rendu (flash d'ordre).
- **c.** Pas de realtime sur `profiles.server_order` : si l'utilisateur réordonne depuis un autre appareil, l'autre client n'est pas synchronisé.
- **d.** Pas de souscription Realtime sur `server_members` : un kick / leave depuis un autre device n'est pas reflété instantanément (un INSERT/UPDATE sur `servers` lui l'est).

## 2. Bannières / icônes serveurs

- `<img>` direct sans skeleton ni placeholder pendant le download (l'`Avatar` shadcn n'est utilisé que pour les voice participants miniatures).
- Quand `server.icon` est `null` au premier rendu (cache IDB encore en train de charger), on bascule sur le fallback "2 lettres" puis on flash l'image quand la vraie URL arrive → **flicker** visible sur cold load.
- Pas de `loading="lazy"` ni de `decoding="async"`.
- Aucune dimension explicite sur les `<img>` → potentiel layout shift quand le draggable item se monte.

## 3. Catégories / salons (`useChannels`)

**Bon :**
- Requêtes **catégories + channels** déjà fusionnées côté client après deux selects scopés `server_id` (pas de N+1 par catégorie).
- `order('position')` explicite côté DB + retri client.
- Realtime sur `channels` ET `categories` (2 channels distincts, conforme à la règle "1 channel par table") avec `mutationLockRef` pour éviter les rollback pendant les mutations optimistes.
- Cache IDB hydraté avant le 1er fetch.

**Problèmes confirmés :**
- **a.** **Race condition initiale** : la souscription Realtime est posée *après* le 1er fetch (effets séparés, ordre de mount). Un INSERT/UPDATE arrivant entre le `SELECT` et l'arrivée du status `SUBSCRIBED` est perdu. Même pattern qu'on a corrigé pour `useMessages`.
- **b.** Le handler Realtime debounce 300 ms puis **invalide deux query keys** (`channels` + `servers`) → refetch complet de 2 requêtes à chaque event mineur (ex: un simple rename de salon). Pas de patch ciblé comme on fait pour `servers`.
- **c.** `useChannels` n'est monté que pour le serveur actif (correct), mais le prefetch côté `useServers` ne s'abonne pas au Realtime → si un salon est ajouté dans un serveur non-actif, le cache prefetché devient stale jusqu'au switch.
- **d.** Aucune jointure / aucun N+1, mais `cat.channels.filter` est en O(N·M) sur le tableau de channels → impact négligeable mais corrigeable en bucket par `category_id` une fois.

## 4. Liste des DMs (`useDMConversations`)

**Bon :**
- Cache IDB + React Query hydratés.
- Realtime sur `dm_messages` (INSERT) qui réinvalide → liste mise à jour à chaque nouveau message.

**Problèmes confirmés :**
- **a.** 4 requêtes séquentielles : `dm_participants` (mes convs) → `dm_conversations` → `dm_participants` (tous participants) → `dm_messages`. Pas un N+1 mais on peut faire 1 RPC (`get_dm_conversations_for_user`) ou utiliser les jointures `dm_participants!inner(...)` pour 1 round-trip.
- **b.** Le `select` `dm_messages` ne **limite pas** : récupère **TOUS les messages** des convs juste pour trouver le dernier. Très coûteux sur conversations longues. Devrait être un `DISTINCT ON (conversation_id) … ORDER BY conversation_id, created_at DESC` via RPC, ou un index `(conversation_id, created_at DESC)` + `limit 1` par conv.
- **c.** Realtime ne réagit pas aux UPDATE (ex: rename de groupe, changement d'icône) ni aux INSERT/DELETE sur `dm_participants` (nouveau membre ajouté à un groupe).
- **d.** Pas de patch ciblé sur le dernier message : invalidation complète → refetch des 4 requêtes ci-dessus à chaque message reçu.
- **e.** Même race condition initiale fetch ↔ subscribe que pour les messages.

## 5. Profils utilisateurs

**Bon :**
- `useProfilesRealtime` patche déjà 5 query keys (`members`, `friends`, `dm-conversations`, `profile:id`, `mutual-friends`) sur UPDATE de `profiles`. Pas de refetch, juste patch ciblé.
- Cache partagé via React Query.

**Problèmes confirmés :**
- **a.** Pas de query unifié `['profile', userId]` partagé : `useMembers`, `useFriends`, `useDMConversations` joignent chacun `profiles` dans **leur** requête et stockent une copie distincte. → 3 sources de vérité pour le même utilisateur. Le `useProfilesRealtime` compense en patchant les 5 caches, mais c'est fragile (toute nouvelle query qui joint `profiles` doit être ajoutée à la liste sous peine de désynchro).
- **b.** Pas de `loader` partagé type DataLoader / `prefetchQuery('profile', id)` : ouvrir 10 popups profil = 10 selects (pas de dedup au niveau accès ponctuel — seul le cache par ID dédupe les re-monts).
- **c.** `useServerOrder` refait un `select server_order from profiles` alors que `AuthContext.profile` le contient déjà → doublon.

---

# Corrections proposées (ciblées, sans refacto globale)

### Serveurs
1. Ajouter `.order('created_at', { ascending: true })` (ou `name`) sur la requête `useServers` pour un ordre stable des serveurs sans entrée `server_order`.
2. Initialiser `useServerOrder` avec `placeholderData`/`initialData` issu de `profile.server_order` du `AuthContext` → suppression du fetch séparé et du flash initial.
3. Ajouter une souscription Realtime UPDATE sur `profiles` (champ `server_order`) limitée à `id=eq.${user.id}` qui patche le cache `['server-order', userId]` → sync cross-device.
4. Ajouter Realtime sur `server_members` (filtré `user_id=eq.${user.id}`) → INSERT (rejoint) / DELETE (kick/leave) patché en cache instantanément.

### Bannières / icônes
5. Dans `SortableServerIcon` et `ServerDragOverlay` : remplacer le `<img>` brut par un wrapper qui affiche un `Skeleton` tant que l'image n'a pas chargé (`onLoad` → state ready). Conserver le fallback "2 lettres" uniquement quand `icon === null` *après* hydratation, jamais pendant.
6. Ajouter `loading="lazy"` `decoding="async"` et dimensions explicites sur les `<img>` icônes/bannières.

### Catégories / salons
7. Fix de la race fetch ↔ subscribe (même pattern que `useMessages`) : sur `SUBSCRIBED`, déclencher une invalidation unique pour rattraper les events perdus entre fetch et abonnement.
8. Patcher le cache à la main pour les events UPDATE (rename, déplacement) au lieu de tout invalider. Garder l'invalidation pour INSERT/DELETE uniquement (où on n'a pas tout le payload utile).
9. Quand un INSERT/UPDATE/DELETE arrive sur un serveur **non-actif**, patcher aussi son cache `['channels', otherServerId]` prefetché (sinon stale au switch).

### DMs
10. Remplacer le bloc 4-requêtes par un **RPC** `get_dm_conversations_for_user()` (SECURITY DEFINER) qui retourne en 1 round-trip : conv + participants + dernier message. Sinon a minima : `LIMIT 1` + `ORDER BY created_at DESC` sur `dm_messages` via une vue ou agrégat côté DB.
11. Ajouter Realtime sur `dm_conversations` (UPDATE) et `dm_participants` (INSERT/DELETE) avec patch ciblé.
12. Sur INSERT dans `dm_messages`, patcher directement `lastMessage` du conv concerné dans le cache au lieu d'invalider.

### Profils
13. Ne pas dupliquer le fetch de `server_order` : nourrir `useServerOrder` depuis `AuthContext.profile`.
14. Documenter (commentaire dans `useProfilesRealtime`) la liste des caches à patcher pour toute future query qui joint `profiles`.
15. Exposer un util `prefetchProfile(id)` (wrapper `queryClient.fetchQuery(['profile', id], …, { staleTime: 5 min })`) à appeler au survol/long-press, et faire que tous les popups profil le consomment (dedup automatique + cache partagé).

---

## Détails techniques

- Migration RPC DM : `CREATE FUNCTION get_dm_conversations_for_user() RETURNS TABLE(...) SECURITY DEFINER` + `GRANT EXECUTE TO authenticated`. Index `(conversation_id, created_at DESC)` sur `dm_messages` si manquant.
- Realtime `server_members` et `profiles` (server_order) : déjà publiés (cf. autres usages), il suffit d'ajouter les `.channel(...).on('postgres_changes', ...)`.
- Skeleton image : composant minimal `<ServerIconImage>` interne à `ServerList.tsx` avec `useState(loaded)` + `<Skeleton>` overlay.
- Le fix race condition reprend exactement le pattern de `useMessages` (callback `(status) => status === 'SUBSCRIBED' && invalidate`).

## Hors scope (intentionnel)
- Pas de refacto de l'architecture cache (universal instant UI conservée).
- Pas de modification des règles RLS existantes hors création du RPC.
- Pas de changement visuel sur la sidebar autre que skeleton image.
