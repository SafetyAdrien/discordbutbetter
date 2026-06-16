**Cause** : Lorsqu'on clique sur "Modifier" sur un message contenant un bloc de code, le `<Textarea>` d'édition est rendu avec la prop `autoFocus` (lignes 1583 et 1710 de `src/components/chat/ChatArea.tsx`). Le navigateur déclenche alors un `scrollIntoView` automatique pour centrer le champ focusé. Quand l'utilisateur essaie ensuite de défiler vers le bas de la conversation, ce comportement (combiné aux re-renders / auto-resize de la textarea) ramène la vue vers la textarea d'édition, donnant l'impression qu'on est "remis légèrement plus haut".

**Correction** :

Dans `src/components/chat/ChatArea.tsx`, pour les **deux** textareas d'édition (lignes ~1561 et ~1688) :

1. Retirer la prop `autoFocus`.
2. Dans le callback `ref={(el) => { ... }}`, appeler `el.focus({ preventScroll: true })` après avoir initialisé la hauteur, et placer le curseur en fin de texte (`el.setSelectionRange(el.value.length, el.value.length)`).
3. Garder un drapeau (via `dataset`) pour ne focuser qu'une seule fois à l'ouverture du mode édition, afin de ne pas re-focuser à chaque re-render lié à la frappe.

**Aucun autre fichier modifié.**

**Vérification** : modifier un message contenant un bloc de code → la textarea reçoit le focus sans que la liste des messages ne saute. L'utilisateur peut défiler librement jusqu'au dernier message pendant l'édition.