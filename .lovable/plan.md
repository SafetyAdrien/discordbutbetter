

# Corriger la reactivite des roles (Realtime + Optimistic Updates)

## Probleme identifie

Le systeme d'optimistic updates et de realtime pour le toggle des roles fonctionne correctement au niveau du **cache `["members", serverId]`**. Cependant, les **badges de roles affiches dans le profil** ne se mettent pas a jour instantanement car ils proviennent d'une **prop `roles` statique** (snapshot capture au moment du clic sur le membre).

Quand on ajoute/supprime un role via `RoleCheckboxItem`, le cache members est mis a jour instantanement, mais le composant `UserProfilePopup` continue d'afficher les anciennes valeurs de la prop `roles`.

## Changements

### 1. `UserProfilePopup.tsx` - Lire les roles depuis le cache reactif

Au lieu d'utiliser la prop `roles` (snapshot statique), le composant doit s'abonner au cache `["members", serverId]` via `useQuery` + `select` pour obtenir les roles du membre de maniere reactive.

- Ajouter un `useQuery` avec `select` qui extrait les roles du membre depuis le cache `["members", serverId]` (meme pattern que `RoleCheckboxItem`)
- Utiliser ces roles reactifs pour `displayRoles` au lieu de la prop `roles`
- Conserver la prop `roles` en fallback si le cache n'est pas disponible (ex: mode dialog sans serverId)

```typescript
// Reactive roles from members cache
const { data: reactiveRoles } = useQuery<MemberWithProfile[], Error, Role[]>({
  queryKey: ["members", serverId],
  queryFn: () => Promise.resolve(
    queryClient.getQueryData<MemberWithProfile[]>(["members", serverId]) ?? []
  ),
  select: (members) => {
    const member = members?.find((m) => m.id === memberId);
    return member?.roles ?? [];
  },
  enabled: !!serverId && !!memberId,
  staleTime: Infinity,
  gcTime: Infinity,
});

const displayRoles = (reactiveRoles ?? roles ?? [])
  .filter(role => role.name !== '@everyone')
  .sort((a, b) => (b.position ?? 0) - (a.position ?? 0));
```

### 2. `UserProfilePopup.tsx` - Autoriser la gestion des roles sur soi-meme

Retirer la condition `(!isOwnProfile || isGodUser)` aux lignes 357, 365 et 519. Un utilisateur avec `canManageRoles` devrait pouvoir gerer ses propres roles (coherent avec le changement deja fait dans le menu contextuel du MemberList).

Remplacer par simplement `canManageRoles && serverId && memberId`.

## Detail technique

| Fichier | Modification |
|---|---|
| `src/components/profile/UserProfilePopup.tsx` | Ajouter useQuery reactif pour les roles + retirer restriction isOwnProfile |

Aucun changement de base de donnees requis. Le realtime et les optimistic updates sont deja en place dans `useMembers.ts` et `RoleCheckboxItem.tsx`.
