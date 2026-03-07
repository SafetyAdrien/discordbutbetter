

# Context menu pour gérer les Threads depuis les messages système

## Résumé

Ajouter deux context menus distincts sur les messages système de type `[SYSTEM:THREAD_CREATED]` :

1. **Clic-droit sur le `ThreadSystemMessage` (embed)** → "Modifier le nom" (modal Dialog) + "Supprimer le Thread"  
2. **Clic-droit sur le conteneur global du message système** (la ligne texte + spine) → "Supprimer le message" (supprime uniquement le message système, pas le thread)

## Fichiers modifiés

### 1. `src/components/threads/ThreadSystemMessage.tsx`

- Wrapper le `<button>` dans un `<ContextMenu>` avec deux options (conditionnées par `canManage`)
  - `Pencil` — "Modifier le nom" → ouvre un `Dialog` local avec un `Input` pré-rempli du nom actuel, boutons Annuler/Enregistrer
  - `Trash2` — "Supprimer le Thread" → ouvre un `AlertDialog` de confirmation, appelle `onDelete`
- Nouveaux props : `onRename?: (newName: string) => void`, `onDelete?: () => void`, `canManage?: boolean`
- États locaux : `renameOpen`, `deleteOpen`, `newName`

### 2. `src/components/chat/ChatArea.tsx`

- Importer `useDeleteThread`, `useUpdateThread` depuis `useThreads.ts`
- Importer `useDeleteMessage` (déjà importé)
- Sur le bloc du message système thread (lignes ~1280-1331) :
  - Wrapper le conteneur global dans un `<ContextMenu>` avec une seule option : "Supprimer le message" (`Trash2`, destructive) → appelle `deleteMessage.mutate` sur le `message.id`
  - Passer à `<ThreadSystemMessage>` les nouveaux props :
    - `onRename` → `updateThread.mutate({ threadId, name })`
    - `onDelete` → `deleteThread.mutate({ threadId, channelId })` (+ supprime aussi le message système associé)
    - `canManage` → `thread?.created_by === user?.id || canManageChannels`

### 3. `src/components/channels/AnnouncementChannel.tsx`

- Même traitement : passer `onRename`, `onDelete`, `canManage` aux instances de `ThreadSystemMessage`
- Wrapper les messages système thread dans un `ContextMenu` pour "Supprimer le message"

## Détail technique

- Les hooks `useDeleteThread` et `useUpdateThread` existent déjà dans `useThreads.ts` avec gestion optimiste
- Le `ContextMenu` sur le `ThreadSystemMessage` (embed) ne propagera pas au `ContextMenu` parent (conteneur) grâce à `stopPropagation` sur le trigger
- La modal de renommage suit le pattern existant : `Dialog` + `Input` + `DialogFooter`
- La suppression du message système utilise le même `deleteMessage` déjà disponible dans ChatArea
- L'`AlertDialog` de suppression de thread utilise `requestAnimationFrame` pour l'ouverture (pattern existant pour éviter les conflits Radix)

