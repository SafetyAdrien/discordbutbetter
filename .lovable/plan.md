
Objectif
- Corriger le comportement du clic droit: “Supprimer” doit toujours ouvrir la popup de confirmation, sauf avec SHIFT+Supprimer (suppression directe).

Constat actuel
- Dans `src/components/chat/UniversalMessageContextMenu.tsx`, les items “Supprimer” desktop utilisent `onSelect` + `e.preventDefault()` + `setTimeout`.
- `preventDefault()` empêche la fermeture normale du menu contextuel Radix (mode modal), ce qui bloque/perturbe l’ouverture de `DeleteMessageDialog`.

Plan d’implémentation
1) Corriger le flux desktop de suppression dans `UniversalMessageContextMenu.tsx`
- Modifier les 2 handlers “Supprimer” (message perso + modération):
  - Conserver `onSelect`.
  - Retirer `e.preventDefault()` dans le cas normal.
  - Logique cible:
    - si `isShiftPressed` → `onDelete?.()` immédiatement (pas de popup),
    - sinon → ouvrir la confirmation (`setDeleteOpen(true)`) après fermeture du menu (micro délai `setTimeout(..., 0)` ou `requestAnimationFrame`).

2) Éviter la duplication
- Extraire une petite fonction locale type `handleContextDeleteSelect()` utilisée par les deux `ContextMenuItem` “Supprimer”, pour garantir un comportement identique partout.

3) Ne pas toucher le mobile
- Le comportement mobile (long press + sheet) reste inchangé, car le bug signalé concerne le clic droit desktop.

Détails techniques (section dédiée)
- Fichier: `src/components/chat/UniversalMessageContextMenu.tsx`
- Zones à modifier: les deux `ContextMenuItem` de suppression dans la branche desktop.
- Conserver la détection SHIFT via `useShiftKey` (plus fiable que `event.shiftKey` sur Radix context menu).

Checklist de validation
1. Clic droit sur un message → “Supprimer” (sans SHIFT) → popup de confirmation visible.
2. “Annuler” ferme la popup sans supprimer.
3. “Supprimer” dans la popup supprime bien le message.
4. SHIFT + clic droit → “Supprimer” supprime immédiatement (sans popup).
5. Vérifier ce flux dans les vues qui réutilisent ce composant: DM, thread, voice chat.
