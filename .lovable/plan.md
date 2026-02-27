

# Fix: Dialog "Gerer les roles" ne s'affiche pas

## Cause

Bug sur une seule ligne : dans `renderMember()`, la variable locale `memberId` est calculee via `getMemberId(member.id)` (ligne 486), mais n'est jamais injectee dans l'objet `member`. Quand on fait `setRoleAssignmentTarget(member)` (ligne 590), l'objet stocke n'a pas de `memberId`. Ensuite la condition de rendu (ligne 709) verifie `roleAssignmentTarget.memberId` qui est `undefined` -- le Dialog n'est jamais monte.

## Correction

### `src/components/layout/MemberList.tsx`

Ligne 590 : remplacer `setRoleAssignmentTarget(member)` par `setRoleAssignmentTarget({ ...member, memberId })` pour inclure le `memberId` dans l'objet stocke.

C'est un fix d'une seule ligne. Le reste du code (asDialog, RoleAssignmentPopover, RoleCheckboxItem avec reactive useQuery) est deja correct.

