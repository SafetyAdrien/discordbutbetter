

# Corriger la synchronisation Realtime des roles entre utilisateurs

## Probleme identifie

La table `member_roles` n'a **jamais ete ajoutee a la publication Realtime** (`supabase_realtime`). Cela signifie que lorsque l'utilisateur A assigne un role a l'utilisateur B :

- L'utilisateur A voit le changement instantanement (mise a jour optimiste locale)
- L'utilisateur B ne recoit **aucun evenement Realtime** car la base de donnees n'emet rien pour cette table
- L'utilisateur B doit recharger la page pour voir ses nouveaux roles et permissions

Les hooks `useMembers` et `usePermissionsRealtime` ecoutent bien les changements sur `member_roles`, mais aucun evenement n'est emis car la table n'est pas dans la publication.

## Verification

- `REPLICA IDENTITY FULL` est deja configure sur `member_roles` (migration `20251220225837`)
- Les politiques RLS permettent aux membres de voir les `member_roles` (necessaire pour recevoir les evenements Realtime)
- Les hooks cote client sont deja en place et fonctionnels

## Changement requis

### Migration SQL

Ajouter `member_roles` a la publication `supabase_realtime` :

```sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'member_roles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.member_roles;
  END IF;
END $$;
```

### Impact

Une fois cette migration appliquee :
- Les evenements INSERT/DELETE sur `member_roles` seront emis a tous les clients connectes
- Le hook `useMembers` (canal `member-roles-for-members`) recevra les changements et mettra a jour les badges de roles
- Le hook `usePermissionsRealtime` (canal `perms-member-roles`) recevra les changements et declenchera un refetch de toutes les permissions actives
- L'utilisateur B verra instantanement ses nouvelles permissions (visibilite des salons, boutons actives/desactives, etc.)

### Fichiers modifies

| Element | Modification |
|---|---|
| Nouvelle migration SQL | Ajouter `member_roles` a `supabase_realtime` |

Aucun changement de code frontend necessaire - toute l'infrastructure cote client est deja en place.

