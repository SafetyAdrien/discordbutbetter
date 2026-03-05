

# Optimistic Updates — Salons après refresh

## Analyse de l'existant

Après analyse complète du code, **les optimistic updates sont déjà implémentés** pour toutes les mutations demandées :

| Fonctionnalité | Hook | Optimistic `onMutate` | Status |
|---|---|---|---|
| Duplication salon | `useDuplicateChannel` | Oui (channels + servers + permissions) | Déjà fait |
| Renommage salon | `useUpdateChannel` | Oui (channel-details + channels + servers) | Déjà fait |
| Réordonnancement | `useReorderChannels` / `useReorderCategories` | Oui (channels + servers) | Déjà fait |
| ChatInput permissions | `useMultipleChannelPermissions` + `prevChannelIdRef` | Oui (sessionStorage cache + transition guard) | Déjà fait |

## Problème réel : après un F5 (refresh), le cache React Query est vide

Les optimistic updates fonctionnent pendant une session active, mais **au refresh**, React Query perd tout son cache en mémoire. Le temps que les queries `servers`, `channels`, et `channel-permission` se rechargent, l'UI affiche un état vide ou incohérent pendant ~200-500ms.

## Correctifs proposés

### 1. Persister le cache `channels` dans `sessionStorage` (`useChannels.ts`)

Ajouter un `initialData` alimenté par `sessionStorage` pour que le cache channels soit disponible **dès le premier rendu** après un refresh, avant même que le fetch Supabase ne réponde.

- Dans `useChannels` : sauver le résultat dans `sessionStorage` à chaque fetch réussi (via un `useEffect` sur `data`)
- Lire ce cache comme `initialData` / `placeholderData` au démarrage

### 2. Persister le cache `servers` dans `sessionStorage` (`useServers.ts`)

Même logique : le cache `servers` (qui contient les catégories et canaux pour le `ChannelList`) doit survivre au refresh.

- Dans `useServers` : sauver dans `sessionStorage` après chaque fetch
- Utiliser comme `placeholderData` au démarrage

### 3. Améliorer la transition ChatInput avec cache de permissions persisté

Le cache `sessionStorage` des permissions (`perm:${channelId}:${permission}`) existe déjà (ligne 124 de `useUserChannelPermissions.ts`). Mais le hook `useMultipleChannelPermissions` retourne `isLoading: true` pendant le premier fetch, ce qui déclenche le guard de transition.

- Changer la logique : quand un cache `sessionStorage` existe pour TOUTES les permissions du salon, ne pas considérer `isLoading` comme bloquant → l'UI affiche directement l'état correct sans flash.

## Fichiers modifiés

| Fichier | Changement |
|---|---|
| `src/hooks/useChannels.ts` | Ajouter persistance sessionStorage du cache channels + lecture au mount comme `placeholderData` |
| `src/hooks/useServers.ts` | Ajouter persistance sessionStorage du cache servers + lecture au mount comme `placeholderData` |
| `src/hooks/useUserChannelPermissions.ts` | Utiliser le cache sessionStorage existant pour bypasser `isLoading` quand toutes les permissions sont cached |

## Détail technique

### `useChannels.ts`
```text
// Après le queryFn, ajouter un useEffect :
useEffect(() => {
  if (data && serverId) {
    sessionStorage.setItem(`cache:channels:${serverId}`, JSON.stringify(data));
  }
}, [data, serverId]);

// Dans useQuery, ajouter :
placeholderData: () => {
  const cached = sessionStorage.getItem(`cache:channels:${serverId}`);
  return cached ? JSON.parse(cached) : undefined;
},
```

### `useServers.ts`
```text
// Même pattern avec clé `cache:servers:${user.id}`
```

### `useUserChannelPermissions.ts`
```text
// Dans useMultipleChannelPermissions, modifier isLoading :
const allCached = permissions.every(p => 
  channelId ? getPermissionCache(`${channelId}:${p}`) !== null : false
);
const isLoading = allCached ? false : queries.some(q => q.isLoading);
```

Aucun autre fichier ne sera modifié.

