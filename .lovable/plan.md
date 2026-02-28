
# Ajouter modifier/supprimer dans le chat vocal

## Probleme

Les messages dans le panneau de chat des salons vocaux (`VoiceChannelChat`) n'ont aucune interaction : pas de clic droit, pas de modification, pas de suppression. Le composant affiche les messages en lecture seule.

## Solution

Integrer le composant `UniversalMessageContextMenu` (deja utilise dans `ChatArea`) autour de chaque message dans `VoiceChannelChat`, et ajouter la logique d'edition inline et de suppression.

## Fichier a modifier

### `src/components/channels/voice/VoiceChannelChat.tsx`

1. **Importer les hooks et composants necessaires** :
   - `useEditMessage`, `useDeleteMessage` depuis `@/hooks/useMessages`
   - `useAuth` depuis `@/contexts/AuthContext`
   - `UniversalMessageContextMenu` depuis `@/components/chat/UniversalMessageContextMenu`
   - `copyToClipboard` depuis `@/lib/clipboard`
   - `Textarea` depuis `@/components/ui/textarea`
   - `toast` depuis `sonner`

2. **Ajouter les etats locaux** :
   - `editingMessageId` : ID du message en cours d'edition (ou `null`)
   - `editContent` : contenu du champ d'edition

3. **Instancier les hooks** :
   - `useEditMessage()`, `useDeleteMessage()`, `useAuth()` pour connaitre l'utilisateur courant

4. **Creer les handlers** :
   - `handleEdit(messageId, content)` : active le mode edition
   - `handleSaveEdit()` : appelle `editMessage.mutate` puis reset l'etat
   - `handleCancelEdit()` : reset l'etat
   - `handleDelete(messageId)` : appelle `deleteMessage.mutate`
   - `handleCopyText(content)` : copie le texte dans le presse-papier
   - `handleCopyId(messageId)` : copie l'ID
   - `handleCopyLink(messageId)` : copie un lien vers le message

5. **Envelopper chaque message** avec `UniversalMessageContextMenu` :
   - Passer `isOwnMessage` base sur `user?.id === message.author_id`
   - Fournir les callbacks `onEdit`, `onDelete`, `onCopyText`, `onCopyId`, `onCopyLink`, `onReply`
   - Desactiver `onCreateThread` et `onPin` (non pertinents pour le chat vocal)

6. **Afficher le mode edition inline** :
   - Quand `editingMessageId === message.id`, remplacer le `<p>` du contenu par un `<Textarea>` avec boutons Sauvegarder/Annuler
   - Touche Entree pour sauvegarder, Echap pour annuler

## Resultat

Les utilisateurs pourront faire un clic droit sur leurs messages dans le chat vocal pour les modifier ou supprimer, avec le meme menu contextuel que dans les salons textuels classiques.
