

# Correctif : Synchronisation complète des caches Threads

## Problème

Les mutations de threads (création, suppression, renommage, verrouillage, fermeture, suivi) n'invalident pas tous les caches React Query de manière cohérente. Résultat : certaines vues (sidebar, popover, ThreadView) ne reflètent pas les changements.

## Analyse des incohérences actuelles

| Mutation | Manque |
|----------|--------|
| `useCreateThread` | `followed-threads`, `all-followed-threads` |
| `useArchiveThread` | `followed-threads`, `all-followed-threads`, `thread` |
| `useDeleteThread` | `all-followed-threads`, `thread` |
| `useLockThread` | `followed-threads` |
| `useCloseThread` | `followed-threads` |
| `useUpdateThread` | `all-followed-threads` |
| `useFollowThread` | `all-followed-threads` |
| `useUnfollowThread` | `all-followed-threads` |

## Solution

Uniformiser toutes les invalidations. Chaque mutation thread doit invalider les 4 clés :
- `['threads', channelId]` — liste des threads du salon
- `['thread', threadId]` — thread individuel
- `['followed-threads']` — threads suivis par salon
- `['all-followed-threads']` — threads suivis pour la sidebar serveur

## Fichiers modifiés

| Fichier | Changement |
|---------|------------|
| `src/hooks/useThreads.ts` | Ajouter les invalidations manquantes dans `onSettled`/`onSuccess` de chaque mutation |
| `src/hooks/useThreadFollow.ts` | Ajouter `['all-followed-threads']` dans `onSuccess` de follow/unfollow |

