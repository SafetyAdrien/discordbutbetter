

## Analyse

Le délai résiduel après chargement provient de :

1. **`useUserChannelPermissions`** (ligne ~227) : `placeholderData: defaultPermissions(true)` n'est utilisé qu'à la première visite. Le `useQuery` attend toujours la résolution RPC avant de marquer `isSuccess`, ce qui bloque les composants utilisant `isLoading`.

2. **`useChannelsVisibility`** (ligne ~165) : `isPending` reste `true` tant que TOUTES les requêtes ne sont pas résolues. Bien qu'il y ait un fallback optimiste, certains composants consomment `isLoading` directement → flash visible.

3. **`useHasChannelPermission`** (ligne ~67) : Sur la 2ᵉ visite, le cache IndexedDB (`getPermissionCache`) est lu de manière synchrone via `cacheGetSync`, mais **uniquement après warmup**. Si le composant monte avant `warmCache().finally(...)` → cache miss → fallback `true` → re-render quand RPC répond.

4. **`usePermissionsRealtime`** : Le `setInterval(50ms)` tourne en permanence — micro-coût CPU mais pas la cause du délai visuel.

5. **Cause principale** : Le hook `useUserChannelPermissions` n'utilise PAS le cache IndexedDB synchrone comme `initialData`. Il se contente de `placeholderData` qui est remplacé dès que la query roule, créant une transition visible (true partout → vraies valeurs).

## Solution

### `src/hooks/useUserChannelPermissions.ts`

**A. `useUserChannelPermissions`** : Utiliser `initialData` (cache IDB) au lieu de `placeholderData`. `initialData` est traité comme une vraie valeur fraîche → pas de transition de loading.

```ts
return useQuery({
  // ...
  initialData: cachedPerms ?? undefined,  // si cache existe, instantané
  initialDataUpdatedAt: cachedPerms ? Date.now() : 0,
  placeholderData: cachedPerms ?? defaultPermissions(true), // fallback 1ère visite
});
```

**B. `useHasChannelPermission`** : Idem, lire le cache IDB en synchrone et le passer comme `initialData` :

```ts
const cached = getPermissionCache(cacheKey);
useQuery({
  // ...
  initialData: cached !== null ? cached : undefined,
  initialDataUpdatedAt: cached !== null ? Date.now() : 0,
});
```

**C. `useMultipleChannelPermissions`** : Pour chaque permission, lire le cache et passer `initialData` à la query correspondante.

**D. `useChannelsVisibility`** : Lire le cache `${channelId}:view_channel` pour chaque canal et le passer comme `initialData`. Plus de `isPending` qui bloque.

### `src/hooks/usePermissionsRealtime.ts`

Remplacer le `setInterval(50ms)` permanent par un mécanisme event-driven : déclencher la vérification post-lock via un `setTimeout` planifié au moment du lock, pas par polling.

```ts
export function lockPermissionsMutation(ms = 50) {
  permissionsMutationLockRef.current = true;
  setTimeout(() => {
    permissionsMutationLockRef.current = false;
    // Trigger post-lock event
    window.dispatchEvent(new CustomEvent('permissions:lock-released'));
  }, ms);
}
```

Dans le hook : écouter l'event au lieu de polling.

## Fichiers modifiés
- `src/hooks/useUserChannelPermissions.ts` — `initialData` depuis cache IDB partout
- `src/hooks/usePermissionsRealtime.ts` — supprimer `setInterval`, utiliser event

## Résultat attendu
- 1ère visite : fallback optimiste `true` (déjà le cas)
- 2ᵉ visite et + : valeurs réelles depuis cache IDB instantanément, **zéro flash, zéro re-render visible** lorsque la RPC répond avec les mêmes valeurs
- Aucun polling CPU permanent

