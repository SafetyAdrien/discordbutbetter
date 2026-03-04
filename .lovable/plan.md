

# Corriger le "Entrée = Sélection + Envoi" pour les mentions

## Problème

Le mécanisme actuel a un bug de timing : `handleMentionSelect` appelle `onChange(newValue)` puis dans un `setTimeout(0)` appelle `handleSendMessageRef.current()`. Mais cette ref pointe vers un `handleSendMessage` qui capture l'ancienne valeur `value` dans sa closure — React n'a pas encore re-rendu avec la nouvelle valeur au moment de l'appel. Résultat : le message envoyé peut être vide ou contenir l'ancien texte sans la mention.

## Correction

### `src/components/chat/MessageInput.tsx` — `handleMentionSelect`

- Au lieu de `setTimeout(0)`, utiliser un **double `setTimeout`** ou un **`requestAnimationFrame` + `setTimeout`** pour garantir que React a re-rendu avec le nouveau `value` avant d'appeler le send.
- Plus fiable : stocker le flag `sendAfterMentionRef` et le consommer dans un `useEffect` qui se déclenche quand `value` change (après le re-rendu).

Approche choisie — `useEffect` :
1. Garder `sendAfterMentionRef.current = true` dans `handleKeyDown` (Enter)
2. Ajouter un `useEffect` qui observe `value` : si `sendAfterMentionRef.current` est `true`, appeler `handleSendMessage()` et remettre le flag à `false`
3. Supprimer le `if (shouldSend)` du `setTimeout` dans `handleMentionSelect` — le `useEffect` s'en charge après le re-rendu

Cela garantit que le `handleSendMessage` est appelé **après** que React ait mis à jour `value` avec la mention insérée.

