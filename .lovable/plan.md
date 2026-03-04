

# SHIFT+Supprimer dans le menu contextuel : suppression instantanée

## Analyse

Le menu contextuel (clic droit) affiche toujours la popup de confirmation pour "Supprimer". Le comportement SHIFT+clic instantané existe déjà dans la barre d'outils au survol (`UniversalMessageActions`) mais pas dans le menu contextuel (`UniversalMessageContextMenu`).

## Changement

**`src/components/chat/UniversalMessageContextMenu.tsx`**

Modifier les handlers de suppression dans le menu contextuel desktop (les deux `ContextMenuItem` de suppression, lignes 252-258 et 263-270) pour vérifier `event.shiftKey` :
- Si SHIFT pressé → appeler `onDelete()` directement (pas de dialog)
- Si pas de SHIFT → ouvrir `setDeleteOpen(true)` (comportement actuel)

Même logique pour le mode mobile (Sheet) : modifier `handleDeleteClick` (ligne 74) pour accepter l'event et vérifier `shiftKey`.

Aucun autre fichier à modifier — `UniversalMessageActions` gère déjà correctement SHIFT via `isShiftPressed`.

