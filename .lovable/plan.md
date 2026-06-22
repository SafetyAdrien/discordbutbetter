Modifier le rendu du bouton "Ajouter un rôle" dans `UserProfilePopup.tsx` quand `displayRoles.length === 0` pour qu'il adopte le même style compact que le bouton affiché quand des rôles sont déjà équipés.

Changements prévus :
- Remplacer le bouton pleine largeur (`w-full`) avec texte par un bouton carré (`w-5 h-5`) contenant uniquement l'icône `Plus` (taille `w-3 h-3`).
- Conserver l'accessibilité avec `aria-label="Ajouter un rôle"`.
- Garder le gestionnaire `onClick={() => setShowRolePanel(true)}` et les classes de couleur/transition existantes du petit bouton (text-muted-foreground, hover:text-foreground).
- Ne toucher à rien d'autre (le bouton d'ajout quand des rôles existent reste inchangé, ainsi que la liste des rôles).

Fichier concerné :
- `src/components/profile/UserProfilePopup.tsx` (lignes 559-565 environ)