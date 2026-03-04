

# Fix: Navigation revient toujours aux DMs après rechargement

## Cause racine

Race condition entre TanStack Query v5 et l'effet de redirection dans `Index.tsx`.

Séquence au rechargement :
1. `user` est `null`, `authLoading = true` → spinner
2. Auth résout → `user` défini, `authLoading = false`
3. `useServers` passe de `enabled: false` à `enabled: true`
4. **Pendant 1 frame** : `isLoading` est `false` (TanStack Query v5 : `isLoading = isPending && isFetching`, et le fetch n'a pas encore démarré), `servers = []`
5. Le guard `if (!activeServerId || !servers || serversLoading) return;` (ligne 239) **passe** car `serversLoading = false`
6. Le serveur actif n'est pas trouvé dans `servers = []` → `setActiveServerId(null)` → DM view
7. Le serveur ID est persisté comme `null` dans localStorage

## Fix

**Fichier : `src/pages/Index.tsx`**

Remplacer `isLoading` par `isPending` de TanStack Query (qui est `true` tant qu'aucune donnée n'a été reçue, même si la requête n'a pas encore démarré le fetch).

1. Ligne 147 : extraire `isPending` de `useServers()`
2. Ligne 239 : utiliser `isPending` au lieu de `serversLoading` dans le guard de l'effet de redirection
3. Ligne 390 : utiliser `isPending` dans le guard du loading spinner pour éviter un flash de contenu vide

```text
Avant : const { data: servers = [], isLoading: serversLoading } = useServers();
Après : const { data: servers = [], isLoading: serversLoading, isPending: serversPending } = useServers();

Guard redirection (l.239) : if (!activeServerId || !servers || serversPending) return;
Guard spinner (l.390)    : if (authLoading || (user && serversPending)) { ... spinner }
```

Changement minimal, 3 lignes modifiées dans un seul fichier.

