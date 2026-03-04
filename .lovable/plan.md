

# Faire "Entrée" = Sélectionner la mention + Envoyer le message

## Problème
Actuellement, quand l'autocomplete de mention est ouverte, appuyer sur Entrée sélectionne la mention mais n'envoie pas le message. L'utilisateur veut que Entrée fasse les deux en séquence : sélectionner la mention, puis envoyer le message.

## Correction

### `src/components/chat/MessageInput.tsx` — `handleKeyDown` (lignes 303-311)
- Pour `e.key === 'Enter'` (pas Tab), après avoir cliqué sur l'item pour insérer la mention, déclencher `handleSendMessage()` dans un `setTimeout` (pour laisser le state se mettre à jour après l'insertion de la mention)
- Tab garde le comportement actuel (sélectionner sans envoyer)

Concrètement, séparer le cas `Tab` et `Enter` :
- **Tab** : sélectionne la mention, curseur reste dans l'input
- **Enter** : sélectionne la mention, puis envoie le message

Pour fiabiliser l'envoi après insertion, utiliser directement `handleMentionSelect` au lieu du `.click()` DOM, puis appeler `handleSendMessage` dans le callback ou via un flag/ref.

