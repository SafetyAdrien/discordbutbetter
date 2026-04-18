

## Objectif
Créer un composer dédié pour les salons d'annonce (`AnnouncementComposer`) qui remplace le `MessageInput` standard, avec :
- Champ Titre (rendu `# titre` dans le contenu envoyé, invisible en saisie)
- Champ Message
- Pièces jointes images/vidéos **et PDF**
- Bouton GIF (recherche Tenor)
- Toggles "Créer un thread" + "Publier auto" via menu déroulant à côté du bouton Send

## Composant final

Layout (Image 1 + 3) :
```
┌─────────────────────────────────────────────────────┐
│ [📷+]                                                │
│  Title (optional)                                    │
│  Message #publish                                    │
│                                                      │
│  [📄 thumb] [🖼 thumb]   ← attachments staging      │
│                                                      │
│  [📎] [GIF] [😊]                          [Send ▾]  │
└─────────────────────────────────────────────────────┘
```

Le menu **▾** à droite de "Send" ouvre un popover avec :
- ☐ Créer un thread (révèle un input nom du thread sous le composer)
- ☐ Publier auto (publie vers les abonnés à l'envoi)

## Implémentation

### 1. Nouveau fichier `src/components/channels/announcement/AnnouncementComposer.tsx`
- Carte unique englobante (bg `--input`, radius 2xl, shadow elevation 2) — pas une simple barre.
- Header zone : bouton image-add carré (+ icône image) en haut à gauche.
- Inputs empilés :
  - `<input>` Titre, font-bold, placeholder "Title (optional)", `border-0 bg-transparent`
  - `<textarea>` Message avec `MarkdownText` overlay (réutilise `InputMarkdownOverlay`), placeholder dynamique `Message #${channel.name}`
- `AttachmentStagingArea` réutilisé sous les inputs (avec icône PDF custom pour les fichiers `application/pdf`).
- Footer barre d'actions :
  - Gauche : bouton Files (📎 — déclenche `<input type=file accept="image/*,video/*,application/pdf">`), bouton GIF, bouton Emoji (réutilise `EmojiStickerPicker`).
  - Droite : groupe `[Send | ▾]` — bouton Send + chevron qui ouvre le popover de toggles (Image 2).

### 2. Submit logic
```ts
const finalContent = title.trim() 
  ? `# ${title.trim()}\n\n${message}`   // # rendu en H1 par MarkdownText
  : message;

await sendMessage.mutateAsync({ channelId, content: finalContent, attachments });

if (createThreadEnabled && threadName.trim() && newMsgId) {
  await createThread.mutateAsync({ channelId, name: threadName.trim(), messageId: newMsgId });
}
if (autoPublishEnabled) {
  await publishMessage.mutateAsync({ messageId: newMsgId, channelId, content: finalContent, ... });
}
```
- Le `#` n'apparaît jamais dans le champ Titre — il est ajouté à l'envoi uniquement.
- `MarkdownText` rend déjà `# x` comme heading → titre stylé dans la bulle de message.

### 3. Étendre `usePendingAttachments` pour PDF
Modifier le filtre :
```ts
.filter(file => 
  file.type.startsWith('image/') || 
  file.type.startsWith('video/') ||
  file.type === 'application/pdf'
)
```
`useSendMessage` utilise déjà `type: 'file'` pour le reste → PDF stocké comme `'file'` dans `StoredAttachment`.

### 4. GIF picker via Tenor
- Nouveau composant `GifPicker.tsx` (popover) : input recherche, grille de résultats, sélection insère l'URL GIF dans `messageInput` (envoi en lien standard).
- Edge function `supabase/functions/tenor-search/index.ts` qui proxy l'API Tenor v2 (`https://tenor.googleapis.com/v2/search`) avec la clé secrète.
- **Nécessite** : ajouter le secret `TENOR_API_KEY` (via outil `add_secret` lors de l'implémentation).

### 5. Création de thread post-envoi
- Réutilise `useCreateThread` du hook existant.
- Si toggle activé : un input "Nom du thread" apparaît juste sous le composer (au-dessus des actions).
- Après envoi : récupérer l'ID du message créé (retourné par `mutateAsync`) et créer le thread lié.

### 6. Auto-publish
- Réutilise `usePublishMessage` (déjà importé dans AnnouncementChannel).
- Si toggle activé : appel automatique après l'envoi avec les métadonnées du serveur source.

### 7. Intégration dans `AnnouncementChannel.tsx`
Remplacer le bloc `<MessageInput .../>` (lignes ~1081-1097) par :
```tsx
<AnnouncementComposer
  channel={channel}
  serverName={serverName}
  serverIcon={serverIcon}
  members={members}
  permissionDenied={permissionDeniedMessage}
  canAttachFiles={canAttachFiles}
  canCreateThreads={canPerm('create_public_threads') || isAdminOrOwner}
  canPublish={canPublishMessages}
  showFollowBar={!canSendMessages}
  onFollowClick={() => setFollowModalOpen(true)}
/>
```

## Fichiers
**Créés :**
- `src/components/channels/announcement/AnnouncementComposer.tsx`
- `src/components/channels/announcement/GifPicker.tsx`
- `supabase/functions/tenor-search/index.ts` (proxy Tenor)

**Modifiés :**
- `src/hooks/usePendingAttachments.ts` — accepter `application/pdf`
- `src/components/chat/upload/AttachmentStagingArea.tsx` — afficher icône PDF pour fichiers non-media
- `src/components/channels/AnnouncementChannel.tsx` — utiliser `AnnouncementComposer` au lieu de `MessageInput`

**Secret à ajouter :**
- `TENOR_API_KEY` (Google Tenor API key — récupérable sur https://developers.google.com/tenor/guides/quickstart)

## Résultat
Composer dédié aux annonces avec titre auto-`#`, médias + PDF, GIFs Tenor, et publication/thread en un clic via le menu Send déroulant — fidèle aux maquettes Image 1, 2 et 3.

