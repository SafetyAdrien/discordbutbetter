Modifier le comportement des deux boutons "Ajouter un rôle" (icône `Plus`) dans `src/components/profile/UserProfilePopup.tsx` pour qu'ils fonctionnent en toggle :
- Lors du premier clic, le petit conteneur latéral des rôles s'ouvre.
- Lors d'un second clic sur le même bouton, le conteneur se ferme.

**Détail technique :**
- Localiser les deux occurrences `onClick={() => setShowRolePanel(true)}` :
  1. Ligne ~559 : quand aucun rôle n'est équipé.
  2. Ligne ~597 : quand des rôles sont déjà équipés.
- Remplacer par `onClick={() => setShowRolePanel((prev) => !prev)}` dans les deux cas.
- Aucune modification de style ou de structure du panneau n'est nécessaire.
- Vérifier que le reste de la logique (fermeture du profil, clic extérieur, Escape) continue de fonctionner normalement.