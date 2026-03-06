

# Prefetch des permissions de salon pour éliminer le flash des boutons/inputs

## Problème

Au chargement, les composants dépendant des permissions (ChatInput, bouton Suivre, barre de permission denied) flashent car :
1. `useMultipleChannelPermissions` utilise un fallback optimiste `true` quand il n'y a pas de cache sessionStorage
2. Le preloader charge uniquement `server-channel-permissions` (view/connect) mais PAS les permissions individuelles par salon (`send_messages`, `attach_files`, etc.)
3. Résultat : l'input de chat s'affiche en mode éditable puis bascule en "permission refusée", ou le bouton "Suivre" apparaît/disparaît

## Solution

Étendre le preloader pour pré-charger les permissions détaillées des salons actifs via `get_user_channel_permissions`, puis injecter les résultats dans :
- Le cache React Query (`channel-permission` par permission individuelle)
- Le sessionStorage (`perm:channelId:permission`)

Cela garantit que `useMultipleChannelPermissions` trouve immédiatement les valeurs en cache au lieu de tomber sur le fallback optimiste `true`.

## Fichiers modifiés (1)

### `src/hooks/usePreloader.ts`
- Après le chargement des canaux (GROUP 6), ajouter un GROUP 6b qui :
  1. Identifie les salons à pré-charger (salons récents + premier salon texte par serveur — même ensemble que les messages)
  2. Pour chaque salon, appelle `get_user_channel_permissions` (ou lit le cache sessionStorage)
  3. Injecte chaque permission dans le queryClient avec la clé `['channel-permission', channelId, permission, userId]`
  4. Écrit dans sessionStorage avec le préfixe `perm:channelId:permission` (format compatible avec le hook existant)

```text
Flux :
channelsPromise.then →
  channelIdsToLoad (récents + premier par serveur)
  → Promise.all(channelIds.map(chId =>
      get_user_channel_permissions(_user_id, _channel_id)
      → forEach permission:
          setQueryData(['channel-permission', chId, perm, userId], { permission, granted })
          sessionStorage.setItem('perm:chId:perm', granted ? '1' : '0')
    ))
```

### Détail technique
- Le cache sessionStorage utilise le préfixe `perm:` déjà défini dans `useUserChannelPermissions.ts` — les valeurs écrites par le preloader seront lues immédiatement par les hooks
- Le hook `useMultipleChannelPermissions` détecte déjà `allCached` pour bypasser l'état loading — les permissions pré-remplies activeront ce court-circuit
- Scope limité aux ~30 salons récents pour ne pas surcharger le chargement initial

