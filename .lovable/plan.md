
Objectif: refaire le connector de thread pour qu’il soit exactement comme sur ta capture: une seule ligne continue, verticale qui s’arrête exactement au point de courbe, puis branche horizontale attachée sans aucun décalage.

Plan de correction

1) Supprimer la logique actuelle “2 pièces séparées” dans `ChatArea`
- Enlever les 2 traits verticaux parent (`bottom-[19px]`) des blocs:
  - message avec avatar (`showAuthor`)
  - message groupé
- Enlever les 2 courbes locales (`h-1/2`) dans les blocs thread embed.
- Raison: ces éléments sont indépendants + dépendants de hauteurs variables, donc ils se désalignent.

2) Refaire le spine avec un seul tracé (continu)
- Réutiliser `src/components/threads/ThreadSpine.tsx` en composant paramétrable (au lieu d’un layout fixe).
- Le composant dessinera un seul path (SVG) vertical + arrondi + horizontal, donc jonction garantie.
- Le tracé sera de type:
  - `M x,startY`
  - `V turnY-radius`
  - `Q x,turnY x+radius,turnY`
  - `H x+branchWidth`
- Résultat: la verticale finit exactement au début du “spine qui tourne”.

3) Calculer dynamiquement le point de courbe (plus de valeurs magiques cassées)
- Dans `ChatArea`, pour chaque message ayant un thread:
  - ref du conteneur message
  - ref du bloc thread embed
- Mesurer `turnY` à partir de la vraie position du thread embed (pas de `bottom-[19px]` fixe).
- `startY`:
  - avec avatar: départ sous l’avatar (~44px)
  - groupé: départ en haut de la ligne groupée
- Recalcul via `ResizeObserver` pour rester correct si hauteur change (zoom, responsive, contenu long).

4) Appliquer la même mécanique aux 2 rendus concernés
- Bloc “showAuthor”
- Bloc “grouped message”
- Le rendu système “thread created” restera inchangé sauf si on constate visuellement qu’il doit être harmonisé aussi.

Détails techniques (section dédiée)
- Fichiers:
  - `src/components/threads/ThreadSpine.tsx` (refactor en SVG paramétrable)
  - `src/components/chat/ChatArea.tsx` (suppression ancien spine + refs/mesure + nouveau composant)
- Paramètres visuels alignés à ta capture:
  - axe vertical: `x = 19`
  - rayon de courbe: ~8
  - longueur horizontale: ~13
  - couleur/épaisseur: `border-muted-foreground/30` et épaisseur 2px équivalente
- Plus aucun `bottom-[19px]` / `h-1/2` pour la jonction critique.

Validation prévue
- Vérifier sur:
  1) message avec avatar + thread
  2) message groupé + thread
  3) contenu thread court et long
- Critère d’acceptation strict:
  - aucune rupture visuelle entre vertical et courbe
  - la verticale ne dépasse jamais après le point de rotation
  - la branche horizontale part exactement du point de rotation
