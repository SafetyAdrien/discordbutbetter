Objectif : rendre le déplacement des catégories ouvertes fiable, même quand elles contiennent plusieurs salons et occupent une grande hauteur.

Plan :
1. Séparer la zone de tri des catégories de leur contenu ouvert
   - Garder uniquement l’en-tête de catégorie comme élément sortable mesuré par dnd-kit.
   - Laisser les salons enfants affichés visuellement sous la catégorie, sans agrandir la zone de collision sortable de la catégorie.

2. Ajouter une zone de drop dédiée pour les catégories ouvertes
   - Maintenir le drag sur l’en-tête de catégorie.
   - Éviter que les salons internes ou la grande hauteur du bloc ouvert interceptent le drop.
   - Conserver le comportement actuel pour le drag de salons entre catégories.

3. Corriger le calcul final de réordonnancement
   - Utiliser la catégorie réellement survolée et la position `before/after` au moment du drop.
   - Si le drop revient sur la catégorie active ou produit le même ordre, ne pas déclencher de mutation inutile.
   - S’assurer que déplacer une catégorie ouverte vers le haut ou vers le bas modifie bien `orderedIds`.

4. Vérifier en preview
   - Tester catégorie ouverte vers catégorie ouverte.
   - Tester catégorie ouverte vers catégorie fermée.
   - Vérifier que le drag de salons entre catégories reste fonctionnel.

Fichiers concernés :
- `src/components/layout/ChannelList.tsx`

Aucun changement backend prévu.