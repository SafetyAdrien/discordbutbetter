

## Problème

Actuellement dans `AnnouncementChannel`, quand un message est publié avec une image d'en-tête + du texte + d'autres pièces jointes, l'ordre de rendu n'est pas garanti :
- Le texte (titre `# Titre` + corps) s'affiche via `<MarkdownText />`
- **Toutes** les pièces jointes (y compris l'image d'en-tête) s'affichent ensuite via `<MessageAttachments />`

Résultat : l'image d'en-tête, qui devrait être visuellement la première chose vue, se retrouve en bas du message.

## Investigation nécessaire

Je dois vérifier dans `AnnouncementChannel.tsx` (lignes ~880-1000) comment les messages sont actuellement rendus pour confirmer l'ordre exact, et m'assurer que la première pièce jointe envoyée par le composer est bien l'image d'en-tête (déjà le cas dans `AnnouncementComposer.handleSubmit` qui prepend `headerImage` aux attachments).

## Solution

Réorganiser le rendu d'un message d'annonce dans `AnnouncementChannel.tsx` selon l'ordre demandé :

1. **Image d'en-tête** (première pièce jointe si elle est de type image) — rendue seule en haut, format pleine largeur (proéminent comme une bannière)
2. **Contenu texte** (titre `# ...` + corps Markdown)
3. **Autres pièces jointes** (fichiers restants : PDFs, vidéos, autres images)
4. **Embed du fil** (`ThreadSystemMessage` si `is_system === true` pour `THREAD_CREATED`)

### Logique de séparation

```tsx
const allAttachments = (message as any).attachments as StoredAttachment[] || [];
const headerImage = allAttachments[0]?.type?.startsWith('image/') ? allAttachments[0] : null;
const otherAttachments = headerImage ? allAttachments.slice(1) : allAttachments;
```

### Ordre de rendu

```tsx
{/* 1. Header image — full width, prominent */}
{headerImage && (
  <div className="mb-3 -mx-1">
    <MessageAttachments attachments={[headerImage]} />
  </div>
)}

{/* 2. Text content */}
<MarkdownText>{message.content}</MarkdownText>

{/* 3. Other attachments */}
{otherAttachments.length > 0 && (
  <MessageAttachments attachments={otherAttachments} />
)}

{/* 4. Thread embed (existing logic, unchanged) */}
```

Appliquer cette logique aux **deux** points de rendu identifiés (message principal ~ligne 906 et version groupée ~ligne 981).

## Fichier modifié

- `src/components/channels/announcement/AnnouncementChannel.tsx` — réorganiser l'ordre de rendu (header image en premier, texte ensuite, autres pièces jointes après).

## Résultat

Les annonces publiées affichent désormais l'image d'en-tête comme bannière proéminente en haut, suivie du titre/contenu, puis des éventuelles autres pièces jointes, et enfin l'embed du fil — exactement comme dans la maquette de référence.

