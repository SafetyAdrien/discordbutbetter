
# Utiliser le profil membre pour "Gerer les roles" depuis le clic-droit

## Objectif

Quand l'utilisateur clique sur "Gerer les roles" dans le menu contextuel de la liste des membres, ouvrir le **UserProfilePopup** du membre (la meme carte de profil que lors d'un clic normal) avec le panneau de roles deja visible, au lieu du Dialog simplifie actuel (`RoleAssignmentPopover asDialog`).

## Changements

### 1. `src/components/profile/UserProfilePopup.tsx` - Ajouter prop `initialShowRolePanel`

Ajouter une prop optionnelle `initialShowRolePanel?: boolean` qui, quand `true`, initialise `showRolePanel` a `true` des le montage. Cela permet d'ouvrir directement le panneau lateral des roles.

```typescript
interface UserProfilePopupProps {
  // ... existing props
  initialShowRolePanel?: boolean;
}

// Inside component:
const [showRolePanel, setShowRolePanel] = useState(initialShowRolePanel ?? false);
```

Un `useEffect` synchronisera `showRolePanel` avec `initialShowRolePanel` quand la popup s'ouvre pour un nouveau membre.

### 2. `src/components/layout/MemberList.tsx` - Remplacer le Dialog par le ProfilePopup

- Supprimer le rendu de `RoleAssignmentPopover asDialog` (lignes 708-732).
- Quand "Gerer les roles" est clique dans le context menu, appeler `setSelectedMember(member)` avec un flag indiquant d'ouvrir le panneau de roles.
- Ajouter un etat `openWithRoles: boolean` qui est passe comme `initialShowRolePanel` au `UserProfilePopup` existant.
- Supprimer l'etat `roleAssignmentTarget` devenu inutile.
- Supprimer l'import de `RoleAssignmentPopover`.

Le flux devient :
1. Clic droit sur un membre -> "Gerer les roles"
2. Ouvre le `UserProfilePopup` en mode `card` avec `initialShowRolePanel={true}`
3. Le panneau lateral des roles est immediatement visible

### Fichiers modifies

| Fichier | Action |
|---|---|
| `src/components/profile/UserProfilePopup.tsx` | Ajouter prop `initialShowRolePanel` |
| `src/components/layout/MemberList.tsx` | Remplacer `RoleAssignmentPopover asDialog` par ouverture du `UserProfilePopup` avec roles |
