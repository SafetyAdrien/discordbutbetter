## Objectif
Corriger le déplacement des catégories ouvertes pour que le drop modifie réellement l'ordre, au lieu de laisser la catégorie à sa position initiale.

## Plan
1. Remplacer la détection actuelle basée sur `over` par un calcul explicite de la cible catégorie sous le pointeur au moment du drop.
2. Pour un drag de catégorie, ignorer les salons enfants et ne considérer que les en-têtes `.dnd-item` des autres catégories.
3. Calculer `before/after` avec la position verticale réelle du pointeur sur l'en-tête cible, puis reconstruire `orderedIds` depuis l'ordre visible actuel.
4. Ne pas lancer de mutation si l'ordre calculé est identique, sinon appeler `reorderCategories` avec le nouvel ordre.
5. Conserver la logique existante de drag des salons vers/dans les catégories.