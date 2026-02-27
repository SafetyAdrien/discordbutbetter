

# Corrections du menu "Gérer les rôles"

## Problèmes identifiés

1. **Le menu n'est pas accessible pour soi-même** : La condition à la ligne 588 exclut les propriétaires et seconds propriétaires (`!isOwner && !isSecondaryOwner`). Si l'utilisateur connecté est le propriétaire du serveur et fait un clic droit sur lui-même, l'option n'apparaît pas.

2. **Le menu contextuel se ferme au clic sur "Gérer les rôles"** : Le composant `ContextMenuItem` de Radix ferme automatiquement le menu au clic. Pour empêcher cela, il faut utiliser `onSelect` avec `e.preventDefault()` au lieu de `onClick`.

## Changements

### `src/components/layout/MemberList.tsx`

**A. Retirer la restriction sur soi-même**

Modifier la condition de visibilité de l'option :

```text
// Avant (ligne 588)
{canManageRoles && !isOwner && !isSecondaryOwner && memberId && (

// Après
{canManageRoles && memberId && (
```

Cela permet à tout utilisateur ayant la permission de gérer les rôles de voir l'option, y compris pour lui-même.

**B. Empêcher la fermeture du menu contextuel**

Remplacer `onClick` par `onSelect` avec `preventDefault()` sur le `ContextMenuItem` de "Gérer les rôles" :

```typescript
<ContextMenuItem onSelect={(e) => {
  e.preventDefault();
  setRoleTarget({ memberId, userId: member.id });
}}>
```

`e.preventDefault()` dans `onSelect` empêche Radix de fermer le menu contextuel. Le panneau de rôles s'ouvrira à côté du menu qui restera visible.

### Fichiers modifiés

| Fichier | Modification |
|---|---|
| `src/components/layout/MemberList.tsx` | Retirer la restriction owner/secondaryOwner + utiliser `onSelect` avec `preventDefault` |

