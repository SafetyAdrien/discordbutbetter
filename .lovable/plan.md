
Objectif
- Garantir que TAB dans l’autocomplete des mentions (#, @, @&) insère uniquement la mention dans le chatInput, sans envoyer le message.

Constat technique
- L’autocomplete est rendu à l’intérieur du `<form>` de `MessageInput`.
- Dans `MentionAutocomplete.tsx`, les items sont des `<button>` sans `type`.
- Dans un formulaire HTML, un `<button>` sans `type` est `submit` par défaut.
- Donc, quand TAB déclenche le `.click()` de l’item sélectionné, cela peut soumettre le formulaire et envoyer le message.

Plan de correction
1) Empêcher toute soumission depuis les items d’autocomplete
- Fichier: `src/components/chat/MentionAutocomplete.tsx`
- Ajouter `type="button"` sur les 3 boutons de suggestion (membres, rôles, salons).
- Effet attendu: le click (manuel ou programmatique via TAB/Enter) n’appelle plus `onSubmit` du formulaire.

2) Conserver le comportement clavier attendu
- Fichier: `src/components/chat/MessageInput.tsx`
- Ne pas changer la logique métier actuelle:
  - TAB => sélection/insert seulement
  - ENTER dans autocomplete => sélection puis envoi (via `sendAfterMentionRef`)
- Vérifier que `sendAfterMentionRef` reste forcé à `false` pour TAB (déjà en place), afin d’éviter tout envoi via l’effet.

3) Vérification fonctionnelle ciblée
- Cas # (salon): taper `#`, ouvrir autocomplete, TAB => insertion dans input uniquement, aucun envoi.
- Cas @user et @&role: même comportement TAB.
- Cas ENTER dans autocomplete: insertion + envoi immédiat (comportement voulu).
- Cas clic souris sur suggestion: insertion uniquement, aucun envoi implicite.

Risques / impact
- Changement faible et localisé.
- Aucun impact attendu sur le rendu des suggestions ni sur la résolution des mentions, uniquement sur la soumission involontaire du formulaire.
