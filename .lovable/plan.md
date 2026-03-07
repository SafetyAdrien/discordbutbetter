

# Corriger le rafraîchissement du toggle Fermer/Verrouiller dans le context menu des threads

## Problème

Les options "Fermer/Rouvrir" et "Verrouiller/Déverrouiller" existent déjà dans le context menu, mais après un clic, l'état ne se met pas à jour dans la sidebar. Les mutations `useCloseThread` et `useLockThread` invalident `['threads', channelId]` mais la sidebar utilise la query `['all-followed-threads', ...]` qui n'est jamais invalidée.

## Changement

### `src/hooks/useThreads.ts`

Dans `useCloseThread` et `useLockThread`, ajouter l'invalidation de la query `['all-followed-threads']` dans le `onSuccess` :

```ts
queryClient.invalidateQueries({ queryKey: ['all-followed-threads'] });
```

Cela garantit que la sidebar se rafraîchit et affiche le bon label ("Rouvrir le fil" / "Déverrouiller le fil") après mutation.

