

# Fix: Participants fantômes après départ du salon vocal

## Cause racine

Le problème n'est **ni** le realtime ni le retrait optimiste (ces deux mécanismes fonctionnent). Le vrai problème est que React Query **refetch automatiquement** et annule le retrait optimiste :

1. `useVoiceParticipants` a `staleTime: 0` — les données sont immédiatement périmées
2. Tout re-render, focus de fenêtre, ou remontage du composant déclenche un **refetch automatique** vers la DB
3. Ce refetch ramène le participant supprimé car la propagation DB prend ~200-500ms
4. Résultat : le participant "revient" dans la liste pendant quelques secondes

De plus, `joinChannel` (ligne 231) fait `invalidateQueries({ queryKey: ['voice-participants'] })` qui invalide **tous** les caches participants de tous les salons, déclenchant des refetch inutiles.

## Corrections

### 1. `src/hooks/useVoiceParticipants.ts`

Empêcher React Query de refetch automatiquement et écraser les mises à jour optimistes/realtime :

- `staleTime: 30_000` (30 secondes) — la fraîcheur est gérée par les subscriptions realtime, pas par le polling
- `refetchOnWindowFocus: false` — empêche un refetch au retour sur l'onglet
- `refetchOnMount: 'always'` uniquement si pas de cache existant (pour le premier chargement)
- Sur DELETE : ajouter `payload.old.id` comme fallback de filtrage (ceinture + bretelles)

### 2. `src/contexts/VoiceContext.tsx`

- `joinChannel` ligne 231 : remplacer l'invalidation large `['voice-participants']` par l'invalidation ciblée `['voice-participants', channelId]` — ne refetch que le salon rejoint
- Supprimer la ligne 231 entièrement et utiliser seulement le realtime pour mettre à jour les participants côté observateur

### 3. `src/components/layout/ChannelList.tsx`

Le composant `SortableChannel` instancie `useVoiceParticipants` pour chaque salon vocal listé dans la sidebar. Chaque remontage de ce composant (ex: changement de catégorie, drag & drop) déclenche un refetch qui peut ramener un participant fantôme. Les mêmes options `staleTime` et `refetchOnWindowFocus: false` s'appliquent via le fix global dans le hook.

## Résumé des changements

| Fichier | Modification |
|---|---|
| `useVoiceParticipants.ts` | `staleTime: 30_000`, `refetchOnWindowFocus: false`, fallback filtre DELETE par `id` |
| `VoiceContext.tsx` | Invalidation ciblée par channelId au lieu de globale |

