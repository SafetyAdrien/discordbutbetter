## Plan ciblé

1. **Restaurer les deux icônes visibles à droite**
   - Dans `MessageSearchPanel.tsx`, remplacer le slot unique `X/Search` par deux slots fixes séparés à droite.
   - Garder la loupe toujours montée et toujours visible.
   - Ajouter/reconserver la seconde icône carrée/fenêtre dans son propre emplacement fixe, sans dépendre de l’état ouvert/fermé.

2. **Verrouiller la géométrie de la barre**
   - Conserver une hauteur stricte `32px` sur le conteneur et l’input.
   - Utiliser des largeurs fixes pour les zones d’icônes afin d’éviter tout mouvement, upscale, reflow ou décalage au clic/focus.
   - Ajuster le `padding-right` interne pour réserver exactement la place des deux icônes.

3. **Limiter le changement au strict nécessaire**
   - Ne pas toucher au popover, à sa largeur, à son ancrage, aux sous-panneaux, ni à la modale.
   - Ne pas modifier `MemberList.tsx` sauf si la seconde icône attendue est uniquement définie dans son état repos et doit être reproduite à l’identique côté `MessageSearchPanel.tsx`.

4. **Validation**
   - Vérifier visuellement que la barre ne change pas de hauteur au clic.
   - Vérifier que les deux icônes restent visibles dans tous les états : repos, focus, popover ouvert, texte saisi, filtre actif.
   - Lancer `tsgo --noEmit` et confirmer qu’il n’y a pas de nouvelle erreur.