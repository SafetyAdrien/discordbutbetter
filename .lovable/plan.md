Objectif : supprimer le décalage du curseur et les espaces fantômes après insertion/suppression d’une mention, tout en gardant les mentions supprimables d’un bloc.

Plan :
1. Corriger l’insertion des mentions dans `MessageInput.tsx`
   - Remplacer la portion réellement tapée (`#blo`, `@adr`, etc.) par la mention affichée.
   - Supprimer les espaces de requête restants après la sélection, afin d’éviter les valeurs comme `#Blog   `.
   - Insérer un seul espace contrôlé après la mention, uniquement si nécessaire.

2. Stabiliser le suivi des mentions
   - Enregistrer la position réelle de chaque mention insérée au lieu de seulement chercher son texte plus tard.
   - Recalculer ces positions après les éditions normales du texte.
   - Éviter que des doublons comme deux `#Blog` pointent vers la mauvaise mention.

3. Corriger la suppression au clavier
   - `Backspace` ou `Delete` près/dans une mention doit supprimer toute la mention.
   - Après suppression, nettoyer aussi l’espace adjacent si c’est celui ajouté automatiquement.
   - Fermer immédiatement le menu d’autocomplétion après cette suppression.

4. Empêcher la réouverture intempestive du menu de mentions
   - Ne pas détecter une mention autocomplete si le curseur est dans ou juste après une mention confirmée.
   - Fermer le menu quand le texte restant ne correspond plus à un vrai trigger actif.

5. Ajuster le rendu overlay si nécessaire
   - Garder la textarea et l’overlay sur le même texte visible.
   - Éviter tout rendu qui ajoute une largeur visuelle différente autour de la mention.

Validation :
- Tester insertion via TAB et clic souris pour salon/rôle/utilisateur.
- Vérifier que le curseur arrive juste après `#Blog ` sans espace fantôme.
- Vérifier que taper `test` donne visuellement `#Blog test` et non `#Blog  test`.
- Vérifier que `Backspace`/`Delete` supprime la mention entière et que le menu ne reste pas ouvert.