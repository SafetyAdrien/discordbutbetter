

## Objectif
Refondre le composant de saisie du salon Annonces en un **AnnouncementComposer** dédié, distinct du `MessageInput` standard, intégrant : import média, titre (avec préfixe `#` automatique), contenu, fichier PDF, GIF, et un **popover Send** avec options "Créer un thread" et "Publier" (auto-publication aux salons abonnés).

## État actuel
- `AnnouncementChannel.tsx` ligne 1081 utilise le `MessageInput` standard (chat texte classique).
- Publication aux abonnés (`usePublishMessage`) existe mais déclenchée **après envoi** via `PublishPrompt`.
- Création de thread existe via `CreateThreadModal` mais déclenchée depuis le menu contextuel.
- Pas de champ titre, pas d'upload PDF dédié, pas de GIF, pas d'aperçu d'image en haut.

## Conception du composant

### Nouveau fichier : `src/components/channels/announcement/AnnouncementComposer.tsx`

Layout (cf. images 2 et 3) :
```text
┌─────────────────────────────────────────────────────┐
│ [🖼️+]    ← Tooltip "Upload Header Image"           │
│                                                       │
│ Titre                  ← Input bold/large            │
│ Message d'envoi.       ← Textarea (avec overlay md)  │
│                                                       │
│ [📎 lorem.pdf] ← Pièces jointes PDF/fichiers         │
│                                                       │
│ [📁] [GIF] [😊]                          [Send ▼]   │
└─────────────────────────────────────────────────────┘
```

**Bouton Send (split-button avec popover ancré à gauche)** :
```text
☐ Créer un thread
☐ Publier
              [Send ➤]
```

### Fonctionnalités
1. **Header image** (zone carrée 64×64 en haut-gauche) → upload vers bucket `message-attachments` (image jointe au message, traitée comme première attachment de type image).
2. **Titre** (Input optionnel, `font-bold text-base`) → affiché en première ligne du `content` final sous forme `# {title}\n{message}` (Markdown H1, déjà géré par `MarkdownText`). Pendant la rédaction, l'overlay markdown rend visuellement le `#`.
3. **Contenu** (Textarea avec `InputMarkdownOverlay` + mentions, comme `MessageInput`).
4. **PDF / fichiers** : bouton 📁 → input `accept="application/pdf,image/*,video/*"` → utilise `usePendingAttachments` + `AttachmentStagingArea` existante.
5. **GIF** : bouton dédié → ouvre `EmojiStickerPicker` en mode GIF (déjà supporté) ou un picker GIF léger ; insère l'URL GIF comme attachment image.
6. **Emoji** : bouton 😊 → `EmojiStickerPicker` (insertion dans la textarea).
7. **Popover Send** :
   - `Checkbox "Créer un thread"` → après envoi du message, ouvre `CreateThreadModal` pré-rempli avec le titre.
   - `Checkbox "Publier"` → après envoi, appelle automatiquement `usePublishMessage` (s'il y a des abonnés, sinon toast info).
   - Bouton **Send** envoie le message + déclenche les actions cochées en séquence.

### Logique d'envoi
```ts
const fullContent = title.trim() ? `# ${title.trim()}\n${content}` : content;
const result = await sendMessageMutation.mutateAsync({ channelId, content: fullContent, attachments });
if (autoPublish && followers.length > 0) {
  await publishMessage.mutateAsync({ messageId: result.id, ... });
}
if (autoCreateThread) {
  setCreateThreadForMessageId(result.id); // ouvre le modal existant
}
```

### Permissions respectées
- `canSendMessages` → désactive tout
- `canAttachFiles` → désactive 📁 et header image
- `canPublishMessages` → masque/désactive l'option "Publier"
- `create_public_threads` → masque/désactive l'option "Créer un thread"

### Intégration dans `AnnouncementChannel.tsx`
Remplacer le bloc `<MessageInput …/>` (lignes 1081-1097) par `<AnnouncementComposer …/>` avec props : `channelId`, `serverId`, `serverName`, `serverIcon`, `members`, `followers`, permissions, et callbacks `onCreateThreadFor(messageId, title)`.

Garder `MessageInput` intact pour les autres channels.

## Fichiers modifiés / créés
- **Créé** : `src/components/channels/announcement/AnnouncementComposer.tsx`
- **Modifié** : `src/components/channels/AnnouncementChannel.tsx` — remplace `MessageInput` par `AnnouncementComposer`, branche `onCreateThreadFor` sur `setCreateThreadForMessageId` + état pour pré-titre.
- **Modifié** : `src/components/threads/CreateThreadModal.tsx` — accepter `defaultName` optionnel pour pré-remplir le champ.

## Résultat
Composer Discord-like pour les annonces : header image, titre `#`, contenu Markdown, GIF, fichiers PDF/images, et bouton Send unifié avec options "Créer thread" / "Publier" cochables avant l'envoi — tout en une seule action.

