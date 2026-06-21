Objectif : ajuster légèrement la hauteur du VoiceStatusBadge, aligner verticalement les 3 icônes média du milieu et leur ajouter un fond arrondi qui occupe toute la largeur horizontale, comme indiqué sur la capture.

Changements prévus :

1. **Lecture et ajustement de `src/components/layout/VoiceStatusBadge.tsx`**
   - Réduire très légèrement la hauteur du conteneur en diminuant le padding vertical (`py-1` au lieu de `py-1.5`, par exemple).
   - Resserrer l'espacement entre la ligne de statut (Krisp + déconnexion) et la ligne d'icônes média.

2. **Ajout d'un fond arrondi pleine largeur pour les icônes média**
   - Regrouper les 3 boutons (Vidéo, Partage d'écran, Soundboard) dans un wrapper à fond arrondi (`bg-muted` ou `bg-muted/60`, `rounded-lg`, `w-full`, `px-2`, `py-1`).
   - Centrer verticalement les icônes dans ce wrapper (`flex items-center justify-center gap-3`, boutons de taille fixe).
   - Conserver les styles actifs/inactifs et les tooltips existants.

3. **Ajustement des espaces réservés en bas des listes**
   - Vérifier et, si besoin, réduire les `h-[150px]` dans `src/components/layout/ChannelList.tsx` et `src/components/dm/DMPage.tsx` pour correspondre au nouveau bloc connecté légèrement moins haut.

4. **Validation**
   - Lancer le build TypeScript pour s'assurer qu'il n'y a pas d'erreur.
   - Vérifier visuellement en preview que le bloc est plus compact, que les icônes sont bien alignées et que le fond arrondi occupe toute la largeur.

Avant / après visuel (schéma ASCII) :

````text
Avant :
+----------------------------------+
| Vocal connecté        K  X       |
|       V  S  M                    |
+----------------------------------+

Après :
+----------------------------------+
| Vocal connecté        K  X       |
| [==== V    S    M ====]          |  <- fond arrondi pleine largeur
+----------------------------------+
````