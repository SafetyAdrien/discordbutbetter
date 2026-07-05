Objectif : corriger visuellement le badge anniversaire avec un ajustement beaucoup plus marqué que le précédent.

Plan :
1. Modifier `BirthdayAvatarCrown` pour rendre l’anneau vraiment fin :
   - remplacer le masque actuel qui donne une impression trop épaisse ;
   - utiliser une épaisseur stricte et plafonnée, environ `1px` sur la nav mobile et `1.5px` maximum sur les grands avatars de profil ;
   - réduire l’offset autour de l’avatar pour éviter l’effet “anneau immense”.

2. Agrandir nettement l’icône `Gift` :
   - passer d’environ `16%` du diamètre à environ `24–28%` ;
   - ajouter un minimum plus élevé pour la nav mobile afin qu’elle ne devienne pas minuscule ;
   - repositionner l’icône pour qu’elle soit visuellement attachée à l’anneau, sans flotter trop haut.

3. Conserver la couleur rouge de l’icône et la rendre bien visible :
   - garder le rouge demandé ;
   - conserver un léger glow rouge, sans épaissir l’icône.

4. Appliquer la même logique partout où `UserAvatarImage` est utilisé :
   - nav mobile “Vous” ;
   - profil ;
   - liste des membres ;
   - aucun changement de logique anniversaire, uniquement les proportions visuelles.