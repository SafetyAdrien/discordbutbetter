## Changements dans `src/components/chat/ChatArea.tsx`

### 1. Repositionner le bouton « Aller en bas »
La pastille est actuellement placée à `-top-3` (12px au-dessus du conteneur d'input). On la rapproche pour avoir un écart de 5-7px : passer à `-top-1.5` (6px) au lieu de `-top-3`.

### 2. Désactiver l'auto-scroll pendant l'édition d'un message
Le hook qui force le scroll vers le bas lorsque la liste de messages change (ligne 448-453) et le `ResizeObserver` qui recolle au bas en cas de redimensionnement (ligne 435-440) doivent être neutralisés lorsque `editingMessageId !== null`. Sinon, dès qu'un bloc de code se déplie ou que le textarea d'édition s'agrandit, le viewport saute.

Modifications :
- Ajouter `editingMessageId` comme dépendance du `useEffect` de tracking (ligne 420-446) et faire que le `ResizeObserver` ignore les redimensionnements quand `editingMessageId` est défini.
- Dans le `useEffect` d'auto-scroll sur `messages.length` (ligne 448-453), ajouter une garde : ne pas appeler `scrollToBottom` si `editingMessageId` est non-null.
- Le bouton « Aller en bas » reste fonctionnel pendant l'édition (déjà géré par `!isAtBottom`), donc l'utilisateur garde un moyen explicite de revenir au bas si de nouveaux messages arrivent.

Aucun autre fichier n'est touché. Aucune logique métier (édition, envoi, etc.) n'est modifiée.
