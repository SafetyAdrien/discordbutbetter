
# Sync temps réel du statut — audit global

Le fix actuel (`useProfilesRealtime`) écoute `postgres_changes` UPDATE sur `public.profiles`, mais ne patche **que** le cache `['members']` (MemberList serveur). Tous les autres affichages de statut consomment des caches différents qui restent figés tant qu'il n'y a pas refetch.

## Caches non patchés actuellement

| Vue | Cache React Query | Champ statut |
|---|---|---|
| FriendsPanel / MobileFriendCard | `['friends', userId]` | `profile.status`, `profile.custom_status` |
| DMList / DMUserInfoPanel / MobileDMListItem / MobileDMHeader | `['dm-conversations', userId]` | `participants[].status` |
| UserProfilePopup / UserProfileCard / FullUserProfileModal / MobileFullProfileView / MobileProfileView | `['profile', userId]` | `status`, `custom_status`, `display_name`, etc. |
| Favoris d'amis | `['friend-favorites', userId]` (jointure profile) | `profile.status` |

## Plan

Étendre **un seul** fichier : `src/hooks/useProfilesRealtime.ts`. À chaque event UPDATE sur `public.profiles`, en plus de patcher `['members']`, patcher en place :

1. **`['friends']`** (toutes variantes) — map sur `f.profile.id === updated.id` et merger `status`, `custom_status`, `display_name`, `avatar_url`.
2. **`['dm-conversations']`** — map sur `conv.participants` et merger les mêmes champs sur le participant correspondant.
3. **`['profile', updated.id]`** — `setQueryData` direct avec merge superficiel (préserve les champs non renvoyés par le payload).
4. **`['friend-favorites']`** — même approche que friends si la shape contient un sous-objet `profile`.
5. **`['mutual-friends']`** — idem si applicable.

Tous les patchs utilisent `setQueriesData` avec un prédicat sur la queryKey racine (pas d'invalidate → zéro refetch, instantané). Aucun nouvel abonnement Supabase n'est ajouté : on réutilise le canal `public:profiles` déjà actif.

## Détails techniques

- Garder le pattern existant : flag `changed` pour éviter de réécrire la référence si rien ne change (préserve les renders).
- Champs synchronisés : `status`, `custom_status`, `display_name`, `avatar_url`, `banner_url`, `pronouns`, `activity_type`, `activity_text`, `bio` (seulement là où le champ existe dans la shape du cache cible).
- Cache `['profile', id]` : merge partiel `{ ...old, ...updatedFields }` pour ne pas écraser d'éventuels champs joints (badges, etc.).
- Aucun changement de DB, de RLS, ou de composant UI : les composants relisent leurs caches respectifs et re-rendent automatiquement via React Query.

## Fichier modifié

- `src/hooks/useProfilesRealtime.ts` — ajout des 4-5 patchs supplémentaires dans le handler UPDATE existant.

## Résultat attendu

Quand un utilisateur change son statut (online/idle/dnd/offline) ou son statut personnalisé, **tous** les viewers connectés voient le changement instantanément, partout : liste d'amis, DMs (liste + en-tête + panneau info), popups profil, vue mobile profil, favoris. Pas de F5, pas de délai, pas de refetch réseau.
