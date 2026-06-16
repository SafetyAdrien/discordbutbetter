## Plan

1. **Supprimer la cause du décalage visuel**
   - Garder le `textarea` comme seule couche responsable du curseur et du texte tapé.
   - Rendre l’overlay de mentions sans modifier la largeur mesurée du texte au niveau du caret.
   - Remplacer le padding horizontal actuel des pills (`px-[2px]`) par un rendu visuel qui ne décale pas les glyphes suivants.

2. **Stabiliser l’affichage des mentions dans l’overlay**
   - Faire en sorte que `#Blog` soit visuellement coloré comme une mention sans ajouter de largeur réelle autour du texte.
   - Éviter que le curseur se retrouve “sur” la lettre suivante après la mention.
   - Garder le texte réel du textarea strictement identique au texte visible : `#Blog itu sett`.

3. **Corriger les positions de mentions utilisées par la suppression**
   - Ne plus retrouver les mentions uniquement via `indexOf(display)` quand possible, car les doublons peuvent fausser la position.
   - Introduire une position suivie pour chaque mention insérée afin que Backspace/Delete supprime toujours la bonne mention entière.

4. **Fermer l’autocomplete dans les cas de correction**
   - Si une mention est supprimée en bloc ou si le curseur est dans/juste après une mention confirmée, fermer le menu de sélection.
   - Empêcher sa réouverture tant que l’utilisateur n’a pas retapé un nouveau trigger `@` ou `#`.

5. **Validation ciblée**
   - Tester sélection par TAB et souris pour user/role/channel.
   - Vérifier que le curseur arrive exactement après l’espace de séparation, sans chevaucher la première lettre du texte suivant.
   - Vérifier que Backspace/Delete efface toute la mention et que le menu ne reste pas ouvert.