

# Correction de la reactivite des roles et ajout du menu de roles

## Probleme principal

Le composant `RoleCheckboxItem` derive `isChecked` via `queryClient.getQueryData()` qui est une lecture synchrone sans abonnement au cache. Le composant ne se re-rend **jamais** lorsque le cache est mis a jour par le Realtime ou par d'autres mutations externes. Seul un changement de `isPending` (local) provoque un re-rendu.

De plus, le `RoleAssignmentPopover` declenche depuis le menu contextuel utilise `trigger={<span />}` sans point d'ancrage visible, ce qui rend le positionnement du popover problematique.

## Changements

### 1. `src/components/profile/RoleCheckboxItem.tsx` - Abonnement reactif au cache

Remplacer `queryClient.getQueryData()` par un abonnement reactif au cache React Query en utilisant le hook interne `useQuery` avec `select` pour extraire uniquement l'etat `hasRole` du membre concerne :

```typescript
// Avant (non reactif) :
const isChecked = getHasRoleNow(); // snapshot unique

// Apres (reactif) :
const { data: isChecked = false } = useQuery({
  queryKey: ['members', serverId],
  select: (members: MemberWithProfile[]) => {
    const member = members?.find(m => m.id === memberId);
    return member?.roles?.some(r => r.id === role.id) ?? false;
  },
  // Ne pas refetch, juste s'abonner aux changements du cache
  staleTime: Infinity,
  enabled: false, // pas de fetch propre
  initialData: () => queryClient.getQueryData(['members', serverId]),
});
```

**Note** : `enabled: false` + `initialData` ne fonctionne pas pour l'abonnement. A la place, utiliser simplement `useQuery` avec les memes `queryKey` sans refetch propre en laissant le `staleTime` a `Infinity` et en se reposant sur le `select`. Le hook parent (`useMembers`) est deja actif, donc les donnees sont toujours fraiches dans le cache.

Garder `getHasRoleNow()` uniquement pour la lecture immediate dans `handleRoleToggle` (pour determiner si on ajoute ou retire le role au moment du clic).

Aussi ajouter l'invalidation du cache `['members', serverId]` dans le `onSettled` (refetch) pour garantir la coherence apres mutation.

### 2. `src/components/layout/MemberList.tsx` - Remplacer le popover flottant par un Dialog

Le `RoleAssignmentPopover` avec `trigger={<span />}` ne s'ancre a rien de visible. Le remplacer par un rendu en Dialog (ou Popover sans trigger mais ancre correctement). 

Solution : Utiliser le `RoleAssignmentPopover` avec `open`/`onOpenChange` controles et le rendre dans un `Dialog` au lieu d'un `Popover` quand declenche depuis le menu contextuel. Alternative plus simple : remplacer le `Popover` par un petit `Dialog` centre pour le cas du menu contextuel.

Approche retenue : Rendre le `RoleAssignmentPopover` comme un Dialog modal quand il est declenche depuis le menu contextuel, en ajoutant une prop `asDialog` au composant.

### 3. `src/components/members/RoleAssignmentPopover.tsx` - Support du mode Dialog

Ajouter une prop `asDialog?: boolean`. Quand `true`, rendre le contenu dans un `Dialog`/`DialogContent` au lieu d'un `Popover`/`PopoverContent`. Le contenu interne (liste des roles avec `RoleCheckboxItem`) reste identique.

### 4. `src/components/profile/RoleCheckboxItem.tsx` - Ajout de `lockPermissionsMutation`

Importer et appeler `lockPermissionsMutation(600)` dans le handler de mutation pour empecher les refetch Realtime de permissions pendant le settling, comme c'est deja fait dans `useAssignRoleToMember` et `useRemoveRoleFromMember`.

## Resume des fichiers

| Fichier | Action |
|---|---|
| `src/components/profile/RoleCheckboxItem.tsx` | Remplacer `getQueryData` par `useQuery` + `select` pour reactivite ; ajouter `lockPermissionsMutation` |
| `src/components/members/RoleAssignmentPopover.tsx` | Ajouter prop `asDialog` pour rendu en Dialog modal |
| `src/components/layout/MemberList.tsx` | Passer `asDialog` au `RoleAssignmentPopover` declenche depuis le context menu |

