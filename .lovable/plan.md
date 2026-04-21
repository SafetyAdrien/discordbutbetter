
# Correctif global du chargement instantané des salons, catégories et messages

## Diagnostic confirmé

Le problème n’est pas un seul bug, mais une combinaison de 5 causes structurelles :

1. **Mobile encore branché sur des données incomplètes**
   - `MobileServersView` construit encore la liste des catégories/salons depuis `rawServers`, alors que `useServers()` ne renvoie plus l’arbre complet de façon fiable.
   - Résultat : sur mobile, les salons peuvent apparaître vides ou tardivement même si le cache des channels existe.

2. **Double/triple chargement des mêmes données**
   - `Index` charge déjà `servers`, `channels`, `messages`, `members`.
   - Ensuite des composants enfants rechargent encore :
     - `ChatArea` -> `useChannels(channel.server_id)`
     - `AnnouncementChannel` -> `useMessages(channel.id)`, `useServers()`, `useMembers(channel.server_id)`
     - `MobileChannelListView` -> `useServers()`
     - `ChannelList` -> `useMembers`, `useChannelUnreadCounts`, `useAllFollowedThreadsForServer`, permissions
   - Résultat : ouverture d’un serveur/salon = cascade de requêtes parallèles et latence visible.

3. **Hooks “unread” très coûteux**
   - `useChannelUnreadCounts` fait :
     - 1 requête pour les channels
     - 1 requête pour le read state
     - 1 requête pour les mentions
     - puis **1 HEAD par channel** pour compter les messages non lus
   - `useServerUnreadCounts` fait aussi des comptages par serveur.
   - Les logs réseau montrent de très gros appels `channel_mentions` + de nombreuses requêtes `HEAD /messages`.
   - C’est actuellement l’un des plus gros freins à l’ouverture instantanée.

4. **Preloader trop agressif**
   - `usePreloader` précharge massivement channels, members, permissions, DMs, messages, threads, polls, unread caches.
   - Même s’il n’affiche plus l’écran de chargement, il sature le backend et concurrence les hooks visibles au moment où l’utilisateur ouvre un serveur.

5. **Refetchs incohérents dans l’app**
   - Plusieurs hooks ont été optimisés, mais beaucoup d’autres gardent des comportements “toujours refetch / placeholder seulement / N+1”.
   - Donc l’UI peut afficher un cache, puis déclencher immédiatement d’autres chargements lourds en arrière-plan.

## Ce que je vais corriger

### 1) Unifier la source de vérité des salons
- Faire en sorte que **desktop et mobile** lisent toujours les catégories/salons depuis la même donnée résolue :
  - priorité au cache `useChannels(serverId)`
  - fallback sur cache serveur déjà hydraté
  - jamais sur un arbre partiel non résolu
- Corriger `MobileServersView` pour qu’il n’utilise plus `rawServers` comme source primaire pour la colonne des salons.

### 2) Supprimer les requêtes dupliquées dans les composants enfants
- Refactorer les vues principales pour **recevoir les données déjà chargées** au lieu de rappeler les hooks lourds localement.
- Priorité :
  - `AnnouncementChannel`
  - `ChatArea`
  - `MobileChannelListView`
  - `ChannelList`
- Objectif : à l’ouverture d’un salon, une seule chaîne de données “parent -> enfant”, sans re-fetch inutile.

### 3) Réécrire la logique des unread pour éviter le N+1
- Remplacer les comptages “1 requête par channel / par serveur” par une stratégie batch.
- Deux options propres selon l’existant backend :
  - soit une requête groupée/rpc par serveur
  - soit un calcul incrémental basé sur cache + realtime + read state
- Le but est que l’affichage des badges n’empêche plus l’ouverture instantanée du serveur.

### 4) Rendre le preloader non-bloquant au niveau backend aussi
- Réduire drastiquement son périmètre initial :
  - garder uniquement l’hydratation utile au premier rendu
  - repousser messages/threads/polls/perms détaillées en tâche secondaire beaucoup plus légère
- Prioriser seulement :
  - profil
  - serveurs
  - channels du dernier serveur visité
  - messages du dernier salon visité
- Tout le reste passera en lazy/background réel.

### 5) Stabiliser l’ouverture du salon actif
- Renforcer la sélection du salon actif pour éviter les transitions vides :
  - salon restauré si valide
  - sinon premier salon textuel/announcement/media/forum disponible
  - sinon fallback propre avec état vide contrôlé
- Ajouter des garde-fous pour que l’écran ne reste jamais bloqué sur un “quasi vide” pendant la résolution des données.

### 6) Harmoniser la stratégie cache-first dans les hooks critiques
- Appliquer la même règle aux hooks les plus sollicités :
  - `useServers`
  - `useChannels`
  - `useMessages`
  - `useMembers`
  - unread hooks
  - threads/followed threads si nécessaires au ChannelList
- Objectif :
  - affichage immédiat du cache
  - pas de refetch agressif au mount si la donnée est déjà exploitable
  - invalidation uniquement via realtime ou mutation ciblée

## Fichiers principalement concernés

**À corriger**
- `src/components/mobile/MobileServersView.tsx`
- `src/components/mobile/MobileLayout.tsx`
- `src/pages/Index.tsx`
- `src/components/layout/ChannelList.tsx`
- `src/components/chat/ChatArea.tsx`
- `src/components/channels/AnnouncementChannel.tsx`
- `src/components/mobile/MobileChannelListView.tsx`
- `src/hooks/useChannelUnreadCounts.ts`
- `src/hooks/useServerUnreadCounts.ts`
- `src/hooks/usePreloader.ts`
- potentiellement `src/hooks/useFollowedThreads.ts`
- potentiellement `src/hooks/useThreads.ts`
- potentiellement `src/hooks/usePermissions.ts` / `src/hooks/useServerChannelPermissions.ts`

**Inchangé sauf si nécessaire**
- `src/lib/cache.ts`
- `src/contexts/AuthContext.tsx`

## Résultat attendu après correctif

- Ouvrir l’app : les serveurs apparaissent immédiatement depuis cache
- Ouvrir un serveur : catégories + salons apparaissent immédiatement
- Ouvrir un salon : les 100 derniers messages apparaissent immédiatement depuis cache
- Mobile et desktop se comportent pareil
- Les badges unread/mentions n’ajoutent plus des dizaines/centaines de requêtes
- Plus d’effet “ça charge longtemps alors que le cache existe déjà”

## Détails techniques

- Le profil de perf montre surtout un coût réseau/dev élevé, mais le vrai problème applicatif est la **cascade de requêtes** et le **N+1 unread**.
- Les logs réseau confirment des appels massifs `channel_mentions` et `HEAD messages`.
- `useServers()` ne charge plus l’arbre complet depuis la DB, donc tout composant qui lit `rawServers.categories` comme source primaire est fragile.
- La mémoire projet “Universal Instant UI” est bonne en principe ; c’est son application actuelle qui est incohérente entre hooks parents et composants enfants.
