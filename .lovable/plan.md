# Plan — DM messages audit + Avatar flicker fix

## 1. `src/hooks/useDMMessages.ts`

Aligner sur le pattern `useMessages` corrigé :

- **Ordre & limite** : remplacer `.order('created_at', { ascending: true }).limit(100)` par `.order('created_at', { ascending: false }).limit(50)` puis `.reverse()` côté client, afin de charger les **50 plus récents** (pas les 100 plus anciens).
- **Fix race condition** : dans le `useEffect` Realtime, capter le callback `.subscribe((status) => …)` et déclencher `queryClient.invalidateQueries({ queryKey: [...] })` quand `status === 'SUBSCRIBED'`, pour rattraper tout message arrivé entre le fetch initial et l'abonnement.
- **queryKey scopée à l'utilisateur** : passer de `['dm-messages', conversationId]` à `['dm-messages', user?.id, conversationId]` partout (query, setQueryData INSERT/UPDATE/DELETE, mutations send/edit/delete, persistance IDB). Évite tout cache mélangeant les comptes.
- **Pagination `loadOlder`** : ajouter `loadOlder()`, `hasMoreOlder`, `isLoadingOlder` exactement comme `useMessages` (`.lt('created_at', oldest)` + résolution batch des replies + préservation scroll). Brancher dans `DMConversation.tsx` (équivalent de `ChatArea`).
- **Persistance cache** : mettre à jour la clé IDB en `dm-messages:${user.id}:${conversationId}` et adapter `useCacheRehydrate.ts` (parsing du préfixe en 2 segments).

## 2. Composant `UserAvatarImage` réutilisable

Créer `src/components/ui/user-avatar-image.tsx` :
- API : `{ src?: string | null; alt?: string; fallback: string; className?: string; size?: number }`
- État interne `loaded`/`errored` géré via `onLoad`/`onError` sur l'`<img>` interne (équivalent `ServerIconImage`).
- Skeleton (`<Skeleton>` plein) tant que `!loaded && src && !errored`.
- Fallback initiales si pas de `src` ou erreur de chargement.
- Attributs : `loading="lazy"`, `decoding="async"`.
- Reset `loaded` quand `src` change (via `useEffect`).
- Wrappe `Avatar` + `AvatarImage` + `AvatarFallback` shadcn pour garder la cohérence visuelle (rond, tailles).

## 3. Remplacement dans tous les points d'affichage de l'avatar utilisateur connecté

Remplacer `<Avatar>…<AvatarImage src=…/><AvatarFallback>…</AvatarFallback></Avatar>` par `<UserAvatarImage src={…} fallback={…} className={…} />` dans :

- `src/components/account-settings/AccountSettings.tsx` (panneau user bas-gauche)
- `src/components/account-settings/ProfileSettingsTab.tsx`
- `src/components/profile/ProfileSettings.tsx`
- `src/components/profile/UserProfileCard.tsx` (2 occurrences)
- `src/components/profile/UserProfilePopup.tsx`
- `src/components/profile/FullUserProfileModal.tsx` (avatar user principal ligne 150 — pas les server icons L268 ni friends L293)
- `src/components/profile/ServerProfileEditModal.tsx`
- `src/components/profile/CustomStatusModal.tsx`
- `src/components/profile/EveryoneHerePopup.tsx`
- `src/components/profile/RoleInfoPopup.tsx`
- `src/components/layout/MemberList.tsx` (avatars membres)

Scope strictement avatars utilisateur. Pas de changement sur server icons, friend avatars dans modals tiers, etc.

## Détails techniques

- Aucune migration SQL nécessaire.
- Pas de changement de schéma React Query externe : seul `useCacheRehydrate.ts` doit lire la nouvelle forme de clé IDB pour DMs.
- Tests visuels : ouvrir une DM (vérifier chargement instantané + pas de flicker avatar), scroll vers le haut (loadOlder), envoyer un message depuis un second compte pendant le fetch initial (Realtime catch-up).
