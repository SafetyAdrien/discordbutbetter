Objectif : supprimer le micro-décalage visible au clic sur la barre de recherche en gardant exactement la même géométrie entre l’état repos et l’état popover.

Plan :
1. Remplacer la barre active du popover par la même structure visuelle que l’Input au repos : même hauteur, même radius, même border, même padding, même position absolue de la loupe.
2. Éviter le remplacement perceptible du DOM : l’overlay actif sera strictement superposé aux coordonnées de la barre existante, sans changement de largeur/hauteur/offset.
3. Verrouiller la ligne de texte avec une hauteur/line-height stable pour que le placeholder “Rechercher” ne bouge ni horizontalement ni verticalement.
4. Garder l’icône Inbox hors de l’input et visible à droite, sans mouvement.
5. Ajouter un commentaire anti-régression explicite indiquant que la géométrie doit rester identique à `MemberList`.
6. Vérifier visuellement l’ouverture/fermeture du popover : placeholder, loupe et conteneur doivent rester pixel-stables.