

# Ajouter les options manquantes "Fermer le fil" et "Verrouiller le fil" au context menu

## Constat

Le context menu des threads dans la sidebar contient 6 des 8 options prévues. Il manque :
- **Fermer le fil** (toggle `closed`)
- **Verrouiller le fil** (toggle `locked`)

Les hooks `useCloseThread` et `useLockThread` existent déjà dans `useThreads.ts`.

## Changement

### `src/components/layout/ChannelList.tsx`

1. Importer `useCloseThread` et `useLockThread` depuis `useThreads.ts`, et les icônes `Lock`, `Unlock`, `XCircle`, `CircleDot` depuis `lucide-react`
2. Dans `ThreadContextMenuList`, instancier les deux hooks
3. Ajouter deux items dans le `ContextMenuContent`, entre "Quitter le fil" et "Modifier le fil" (dans le bloc `canManage`) :
   - **Fermer/Rouvrir le fil** (`XCircle`/`CircleDot`) — appelle `closeThread.mutate({ threadId, closed: !thread.closed })`
   - **Verrouiller/Déverrouiller le fil** (`Lock`/`Unlock`) — appelle `lockThread.mutate({ threadId, locked: !thread.locked })`

