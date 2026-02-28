

# Hover toolbar, reactions et verification du chat vocal

## Objectif

Trois ajouts au chat des salons vocaux (`VoiceChannelChat`) :
1. Ajouter le hover toolbar (`UniversalMessageActions`) sur chaque message
2. Ajouter les reactions aux messages (avec affichage, toggle, et Realtime)
3. Verifier que le clic droit (context menu) fonctionne bien pour modifier/supprimer

## Changements

### `src/components/channels/voice/VoiceChannelChat.tsx`

**1. Imports supplementaires :**
- `useShiftKey` depuis `@/hooks/useShiftKey`
- `UniversalMessageActions` depuis `@/components/chat/UniversalMessageActions`
- `useMessageReactions`, `useAddReaction`, `useRemoveReaction`, `Reaction` depuis `@/hooks/useReactions`
- `cn` depuis `@/lib/utils`

**2. Nouveaux etats et hooks :**
- `hoveredMessageId` / `openDropdownMessageId` : pour controler la visibilite du hover toolbar
- `isShiftPressed = useShiftKey()` : pour le mode SHIFT du toolbar
- `messageIds` : memo des IDs de messages
- `useMessageReactions(messageIds)` : donnees de reactions en temps reel
- `useAddReaction()` / `useRemoveReaction()` : mutations

**3. Handler `handleAddReaction` :**
Logique toggle identique a ChatArea : si l'utilisateur a deja reagi avec cet emoji, on supprime ; sinon, on ajoute.

**4. Hover toolbar sur chaque message :**
Envelopper le contenu du message dans un conteneur avec `onMouseEnter`/`onMouseLeave` et y placer `UniversalMessageActions` avec :
- `isVisible` base sur `hoveredMessageId`
- `isShiftPressed`
- Callbacks : `onReply`, `onAddReaction`, `onCopyLink`, `onCopyId`, `onEdit`, `onDelete`, `onDropdownOpenChange`
- Pas de `onCreateThread` ni `onPin` (non pertinents pour le chat vocal)

**5. Affichage des reactions sous chaque message :**
Apres le contenu du message (et l'indicateur "modifie"), afficher les reactions groupees par emoji avec un bouton cliquable pour toggle. Reutiliser la meme logique de groupement que dans ChatArea (grouper par emoji, compter, verifier si l'utilisateur courant a reagi).

**6. Verification du context menu :**
Le context menu (`UniversalMessageContextMenu`) est deja en place. Il faut s'assurer que :
- `onAddReaction` passe le bon handler (actuellement `() => {}`, a remplacer par le vrai handler)
- `onEdit` et `onDelete` sont bien passes (deja ok pour `isOwnMessage`)

### Corrections du context menu existant

Le callback `onAddReaction` dans le context menu est actuellement `() => {}` (no-op). Il sera remplace par `(emoji) => handleAddReaction(message.id, emoji)` pour que les reactions depuis le clic droit fonctionnent aussi.

## Details techniques

- Les reactions utilisent le hook `useMessageReactions` qui inclut deja un abonnement Realtime sur la table `reactions` avec debounce de 300ms
- L'affichage des reactions met en surbrillance (bordure primaire) les emojis sur lesquels l'utilisateur courant a reagi
- Le hover toolbar utilise le positionnement `absolute` en haut a droite du message avec `position: relative` sur le conteneur parent
- Le composant `VoiceChannelChat` etant plus etroit (w-80), le toolbar s'adapte naturellement car il utilise des tailles compactes

## Fichier modifie

- `src/components/channels/voice/VoiceChannelChat.tsx`
