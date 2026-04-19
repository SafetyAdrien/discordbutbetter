

## Compréhension corrigée

Le voile `bg-background/60 + backdrop-blur-sm` que j'ai posé sur le wrapper masque justement ce que tu veux voir. Tu veux **l'inverse** : la bande autour du composer doit être **transparente** pour qu'on voie nettement les messages défiler en arrière-plan tout autour de la carte de saisie.

Actuellement, la liste de messages se termine au-dessus du wrapper du composer (le wrapper occupe `pt-2 pb-4` opaques/voilés en bas du chat). Il faut donc :

1. Rendre le wrapper du composer **totalement transparent** (retirer le voile que je viens d'ajouter).
2. Faire en sorte que la zone de scroll des messages **passe sous** le wrapper du composer, pour que des messages soient effectivement visibles autour de la carte arrondie.

## Solution

### Étape 1 — Retirer le voile (annuler la dernière modif)
- `src/components/chat/ChatArea.tsx` : retirer `bg-background/60 backdrop-blur-sm` du wrapper composer.
- `src/components/channels/AnnouncementChannel.tsx` : idem.

### Étape 2 — Faire passer le scroll sous le composer
Aujourd'hui le layout est `flex-col` avec :
- zone messages (`flex-1` scrollable)
- wrapper composer (`flex-shrink-0`) — pousse les messages vers le haut.

Pour que les messages passent **derrière** le composer :
- Le wrapper du composer devient **positionné en absolu** en bas (`absolute bottom-0 left-0 right-0`) avec `pointer-events-none` sur le wrapper et `pointer-events-auto` sur la carte interne.
- Le parent devient `relative`.
- La zone scrollable récupère un `padding-bottom` égal à la hauteur visible du composer (≈ hauteur de la carte + marges) pour que le dernier message ne soit pas masqué quand on est au bas du scroll.

Résultat visuel : quand on scrolle, les messages glissent **derrière** la carte arrondie du composer (visibles à gauche, droite, au-dessus et en-dessous) ; la carte du composer reste opaque (`bg-input`) et lisible.

## Fichiers modifiés

### `src/components/chat/ChatArea.tsx`
- Wrapper composer : `absolute bottom-0 left-0 right-0 z-10 pointer-events-none px-4 pb-4 pt-2`
- Carte intérieure (`MessageInput` + `TypingIndicator` + `ReplyReference`) : enveloppée dans un `<div className="pointer-events-auto">` pour rester interactive.
- Conteneur parent du chat : ajouter `relative` si pas déjà présent.
- Zone scrollable des messages : ajouter `pb-24` (≈ 96px, hauteur typique du composer mono-ligne ; ajusté pour rester correct quand le composer grandit jusqu'à `max-h-[280px]`).

### `src/components/channels/AnnouncementChannel.tsx`
- Mêmes 3 ajustements que ci-dessus pour le composer d'annonces.

## Garanties « ne casse rien »
- `MessageInput` / `AnnouncementComposer` gardent leur fond `bg-input` opaque → carte de saisie nette.
- `pointer-events-none` sur le wrapper + `pointer-events-auto` sur la carte → on peut toujours cliquer/écrire dans le composer, et on peut sélectionner les messages qui passent dessous *autour* de la carte.
- `TypingIndicator` et `ReplyReference` restent dans la carte interactive, donc visibles et fonctionnels.
- Pas de modification du DM / Threads / Voice.
- `pb-24` sur le scroll empêche le dernier message d'être masqué derrière la carte au repos.

## Hors-scope
- DM, Threads, Voice (pas demandés).
- Tokens CSS et Tailwind config inchangés.

