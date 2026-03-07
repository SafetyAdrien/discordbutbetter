

# Context menu pour les Threads dans la liste des salons + correction sélection

## Résumé

Ajouter un context menu complet (clic-droit) sur chaque thread affiché dans la sidebar, avec 8 options inspirées de la référence Discord. Corriger la sélection visuelle pour qu'elle ne highlight que le thread (pas le salon parent).

## Migration DB

Ajouter deux colonnes à la table `threads` :
- `locked boolean default false` — bloque l'écriture sauf admins/modérateurs
- `closed boolean default false` — ferme le thread (bloque l'écriture + ferme le panneau)

```sql
ALTER TABLE public.threads ADD COLUMN locked boolean NOT NULL DEFAULT false;
ALTER TABLE public.threads ADD COLUMN closed boolean NOT NULL DEFAULT false;
```

## Fichiers modifiés

### 1. `src/types/thread.ts`
- Ajouter `locked?: boolean` et `closed?: boolean` à l'interface `Thread`

### 2. `src/hooks/useThreads.ts`
- Ajouter `useLockThread` et `useCloseThread` mutations (update `locked`/`closed` sur la table threads, avec gestion optimiste)

### 3. `src/components/layout/ChannelList.tsx`

**Context menu sur chaque thread** (dans `SortableChannel`, zone threads lines ~598-624) :
Wrapper le `<button>` thread dans un `<ContextMenu>` avec :
1. **Marquer comme lu** — appelle `useMarkThreadAsRead`
2. **Quitter le fil** — appelle `useUnfollowThread` (supprime du sidebar)
3. *Separator*
4. **Fermer le fil** — `useCloseThread` (met `closed=true`, ferme le panneau droit si ouvert)
5. **Verrouiller le fil** — `useLockThread` (met `locked=true`)
6. **Modifier le fil** — ouvre une modal d'édition (voir point 4)
7. **Copier le lien** — copie `{origin}/channels/{channelId}/{threadId}`
8. *Separator*
9. **Supprimer le fil** — `AlertDialog` confirmation + `useDeleteThread`
10. *Separator*
11. **Copier l'identifiant du fil** — copie `thread.id`

Options 4, 5, 6, 9 conditionnées par `canManage` (créateur du thread ou `manage_threads`/`manage_channels`).

**Correction sélection** :
- Quand `activeThreadId` est défini et correspond à un thread sous un salon, le salon parent ne doit plus avoir la classe `active`. Modifier la prop `isActive` dans les deux endroits où `SortableChannel` est utilisé :  
  `isActive={activeChannelId === channel.id && !activeThreadId}`

### 4. Nouveau : `src/components/threads/EditThreadModal.tsx`

Modal avec 2 tabs (`Tabs` Radix) :
- **Aperçu** : champ nom du thread (Input), toggle privé/public, toggle verrouillé, toggle fermé
- **Permissions** : réutiliser le pattern de `ChannelPermissions` adapté aux permissions thread (`send_messages_in_threads`, `manage_threads`, etc.)

Utilise `useUpdateThread` existant + les nouvelles mutations `useLockThread`/`useCloseThread`.

### 5. `src/components/threads/ThreadView.tsx`
- Vérifier `thread.locked` et `thread.closed` : si `true`, désactiver l'input de message (afficher un message "Ce fil est verrouillé/fermé") sauf pour les utilisateurs avec `manage_threads`

### 6. `src/pages/Index.tsx`
- Passer `activeThreadId` dans la prop `isActive` des `SortableChannel` (déjà fait via ChannelList, juste s'assurer que la logique `isActive={activeChannelId === channel.id && !activeThreadId}` est respectée)

## Détail technique

- Les hooks `useDeleteThread`, `useUpdateThread`, `useUnfollowThread`, `useMarkThreadAsRead` existent déjà
- Le `ContextMenu` thread utilise `onContextMenu stopPropagation` pour ne pas déclencher le menu du salon parent
- La modal d'édition suit le pattern existant de `ChannelSettingsModal` (Dialog + Tabs)
- Les permissions thread sont un sous-ensemble des permissions canal : `send_messages_in_threads`, `manage_threads`, `create_public_threads`, `create_private_threads`

