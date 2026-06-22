# Instant UI partout — corriger délais de profils, messages et listes (desktop + mobile)

## Objectif

Tout doit s'afficher **immédiatement** depuis le cache IndexedDB (warmCache) lorsqu'il existe, et un **skeleton instantané** sinon. Aucun "pop-in" silencieux, aucun spinner intermédiaire quand la donnée est déjà en mémoire.

## Diagnostic actuel

Le pipeline cache-first (cacheGetSync + warmCache + preloader) couvre déjà `useMessages`, `useMembers`, `useDMConversations`, `useServers`. Les trous qui causent les délais ressentis :

1. **Profils utilisateur** — `useBadges`, `useUserBadges`, `useServerProfile`, `useMutualServers`, `useMutualFriends` n'ont **aucun** cache → 2-5 requêtes réseau à chaque ouverture du popup profil.
2. **Messages** — `placeholderData` OK mais le preloader ne pré-charge **que le dernier salon visité** ; les autres salons ré-attendent le réseau. Aucun skeleton dans `ChatArea` / `MobileLayout` quand vide.
3. **Membres / DMs / Serveurs** — cache OK mais listes vides en cold boot sans skeleton (desktop + mobile).
4. **Mobile** — `MobileDMHomeView`, `MobileLayout` (messages, members) n'ont aucun état de chargement.

## Plan d'implémentation

### A. Profils utilisateur (priorité 1 — popup ressenti lent)

- **`src/hooks/useBadges.ts`** + **`useUserBadges.ts`** : ajouter `placeholderData: cacheGetSync('badges:all')` / `cacheGetSync(\`user-badges:\${userId}\`)`, écriture dans `cacheSetAsync` au succès, `staleTime: 5min`, `refetchOnMount: false` si cache.
- **`src/hooks/useServerProfile.ts`** : même pattern, clé `server-profile:${serverId}:${userId}`.
- **`src/hooks/useMutualServers.ts`** + **`useMutualFriends.ts`** : même pattern, clés `mutual-servers:${userId}` / `mutual-friends:${userId}`.
- **`src/hooks/usePreloader.ts`** : ajouter, en slice idle 3 (après DMs), warm-up de `badges:all` (global) et, pour le user courant, `user-badges:${authUserId}`. Les mutual/server-profile restent lazy (pas warmés au boot, juste cachés à la 1ère ouverture pour la 2ème visite instantanée).
- **`UserBadgeList`** : skeleton dot (3 pastilles `animate-pulse`) quand `data === undefined && isFetching`.
- **`FullUserProfileModal`** : skeleton lignes pour sections "Serveurs en commun" / "Amis en commun" quand undefined.

### B. Messages (toutes les salles instant)

- **`src/hooks/usePreloader.ts`** : étendre la slice 2 idle pour seed `messages:${channelId}` des **N derniers salons visités** (lire la queue depuis le cache `recent-channels`, fallback : top 5 salons non-lus du serveur actif). Limite 5 salons pour éviter coût Supabase.
- **`src/components/chat/ChatArea.tsx`** : afficher un skeleton de messages (5-8 placeholders `animate-pulse` reproduisant avatar+nom+texte) quand `messages.length === 0 && isLoading`. Le composant reçoit déjà `messages` en prop → ajouter prop `isLoading` depuis le parent (`Index.tsx` / `MobileLayout.tsx`).
- **`MobileLayout.tsx`** : propager `isLoading` de `useMessages` vers `ChatArea`.

### C. Listes membres / DMs / serveurs (skeletons cold-boot)

- **`MemberList.tsx`** : skeleton (8 lignes avatar+nom `animate-pulse`) quand `isLoading && members.length === 0`.
- **`MobileLayout.tsx`** (member panel) : idem.
- **`MobileDMHomeView.tsx`** : skeleton 6 conversations quand `isLoading && conversations.length === 0`.
- **`ChannelList.tsx`** (sidebar serveurs) : skeleton 4 server icons + channel rows quand `servers.length === 0 && isLoading`.

### D. Garanties anti-régression

- Tous les nouveaux `placeholderData` retournent `undefined` si pas de cache → React Query passe en `isLoading=true` → skeleton s'affiche bien.
- Quand cache présent : `isLoading=false`, render instantané, pas de flash skeleton.
- `cacheSetAsync` appelé dans `onSuccess` / `useEffect` au succès réseau pour rafraîchir IndexedDB.
- Mobile utilise les mêmes hooks → bénéficie automatiquement de chaque amélioration.

## Détails techniques

- Clés cache cohérentes avec `src/lib/cache.ts` (préfixes existants).
- Skeletons via composants `<Skeleton>` shadcn déjà présents (`src/components/ui/skeleton.tsx`).
- Aucune modification des subscriptions Realtime existantes — uniquement ajout d'une couche cache + skeletons.
- Aucune nouvelle dépendance.

## Fichiers touchés

Hooks : `useBadges.ts`, `useUserBadges.ts`, `useServerProfile.ts`, `useMutualServers.ts`, `useMutualFriends.ts`, `usePreloader.ts`.
Composants : `UserBadgeList.tsx`, `FullUserProfileModal.tsx`, `ChatArea.tsx`, `MobileLayout.tsx`, `MemberList.tsx`, `MobileDMHomeView.tsx`, `ChannelList.tsx`.

## Hors scope

- Pas de changement des mutations rôles (déjà instantanées suite à la session précédente).
- Pas de refactor de l'architecture cache existante — uniquement combler les trous.
