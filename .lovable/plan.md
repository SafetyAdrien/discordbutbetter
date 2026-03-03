

# Realtime pour les Server Profiles

## Constat

La table `server_profiles` a déjà le realtime activé (`ALTER PUBLICATION supabase_realtime ADD TABLE public.server_profiles`), mais aucun hook n'écoute les changements en temps réel. Quand l'utilisateur A modifie son profil serveur, l'utilisateur B ne voit le changement qu'après un refresh.

## Changements

### 1. `src/hooks/useProfilesRealtime.ts` — Ajouter un listener sur `server_profiles`

Ajouter un second channel Supabase (canal séparé, conformément au pattern d'isolation existant) qui écoute les événements `INSERT`, `UPDATE` et `DELETE` sur `public.server_profiles`. À chaque événement :

- **INSERT/UPDATE** : Mettre à jour le cache `['server-profile', userId, serverId]` directement via `queryClient.setQueryData`. Également invalider le cache `['members', serverId]` pour que la liste de membres reflète le nouveau nom/avatar.
- **DELETE** : Supprimer l'entrée du cache `['server-profile', userId, serverId]` (le remettre à `null`) et invalider `['members', serverId]`.

### 2. `src/hooks/useMembers.ts` — Joindre les `server_profiles` dans la query

Enrichir la requête `queryFn` pour inclure les données de `server_profiles` dans chaque membre, afin que le display name/avatar serveur soit disponible directement dans le cache members :

- Ajouter un select sur `server_profiles` filtré par `server_id`
- Ajouter un champ `serverProfile` (nullable) dans `MemberWithProfile`
- Les composants d'affichage pourront utiliser `member.serverProfile?.display_name ?? member.user.display_name`

### 3. Mise à jour du cache members dans le listener realtime

Dans le handler realtime de `server_profiles`, patcher directement le cache `['members', serverId]` pour mettre à jour le `serverProfile` du membre concerné — sans refetch réseau.

### Fichiers modifiés
- `src/hooks/useProfilesRealtime.ts` — ajout du channel `server_profiles`
- `src/hooks/useMembers.ts` — ajout du champ `serverProfile` + jointure SQL

