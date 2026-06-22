Agrandir les icônes de la barre de profil de 25 % (scale-125) tout en conservant l'espacement actuel et en évitant tout débordement du conteneur.

Étapes :
1. Dans `src/components/profile/UserProfileCard.tsx`, appliquer `scale-125` aux icônes principales (micro, micro off, casque, casque off, paramètres) et aux chevrons des menus micro/casque.
2. Conserver les gaps actuels (`gap-0.5` sur le conteneur, `flex items-center` sans gap interne) pour ne pas modifier l'espacement entre les groupes.
3. Ajouter `overflow-hidden` sur les boutons d'icônes pour éviter que l'agrandissement par `scale` ne déborde visuellement du conteneur.
4. Vérifier visuellement dans l'aperçu que les icônes restent bien centrées et que la hauteur de la barre de profil (60 px) n'est pas dépassée.