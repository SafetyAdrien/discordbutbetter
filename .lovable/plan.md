Plan d’implémentation :

1. Reprendre le side sheet à partir de la vidéo de référence, pas de l’ancienne version.
   - Utiliser les frames du panneau Discord comme source visuelle.
   - Respecter le comportement observé : le clic sur « Personnaliser » ferme les paramètres et revient à l’interface principale avec le panneau à droite.
   - Aucun overlay sombre, pas de modal centrée, l’app reste visible derrière.

2. Refaire la structure visuelle du side sheet.
   - Panneau fixe à droite, hauteur complète, largeur et espacement alignés sur la vidéo.
   - Header Discord-like : titre, bouton fermer circulaire avec indication ESC.
   - Fond, bordure, ombres, séparateurs, typographie gg sans et densité fidèles.
   - Footer fixe avec les actions « Partager », « Retour/Fermer » et « Appliquer » dans le même esprit Discord.

3. Corriger tous les contrôles manquants ou non fidèles.
   - Sélecteur couleur HSV avec carré saturation/luminosité et slider teinte aux dimensions de la vidéo.
   - Champ HEX, aperçu couleur, pipette, chips de couleur, suppression de chip.
   - Bouton d’ajout de couleur, limite de couleurs, état sélectionné.
   - Slider direction du dégradé visible quand plusieurs couleurs existent.
   - Slider intensité avec valeur affichée.
   - « Surprends-moi », « Réinitialiser », « Partager » et « Appliquer » conservés mais restylés pour coller à Discord.

4. Corriger le rendu du thème derrière le panneau.
   - Le thème doit se prévisualiser en temps réel sur l’interface principale derrière le sheet.
   - Le side sheet doit rester net, non teinté, non lavé, sans blend parasite.
   - Les couleurs sombres doivent assombrir l’interface et les couleurs claires l’éclaircir comme dans la vidéo.

5. Sécuriser le comportement d’application.
   - « Appliquer » doit valider le draft, persister le thème côté backend déjà existant, et déclencher la synchronisation temps réel entre appareils.
   - « Retour/Fermer » doit annuler les changements non appliqués.
   - ESC et le bouton fermer doivent avoir le même comportement.

6. Vérification finale obligatoire.
   - Ouvrir le flux depuis « Personnaliser » et confirmer qu’on revient bien à l’interface principale.
   - Comparer visuellement le side sheet avec les frames de la vidéo.
   - Tester couleur unique, plusieurs couleurs, direction, intensité, reset, partage, appliquer.
   - Vérifier desktop et mobile pour éviter tout élément coupé, manquant ou superposé.