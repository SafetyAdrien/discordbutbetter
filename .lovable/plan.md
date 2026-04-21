

# Correction : bouton "Suivre" partout + RepliedLine Desktop identique au Mobile

## Diagnostic exact

### Bug #1 — Bouton "Suivre" invisible sur Mobile
Sur Desktop (`AnnouncementChannel.tsx` ligne 474-481), le bouton "Suivre" est rendu directement dans le header à côté du nom du salon. C'est l'emplacement attendu (image 1).

Sur Mobile (`MobileChatView.tsx` lignes 166-171), il a été déplacé dans le menu kebab `MobileMoreActionsSheet` → invisible au premier coup d'œil.

### Bug #2 (CRITIQUE) — RepliedLine ne s'affiche jamais sur Desktop
Tout le pipeline est en place côté hooks et composant (`useMessages` résout bien `repliedMessage`, `ChatArea` rend bien `<RepliedLine>` ligne 1534). MAIS dans `src/pages/Index.tsx` lignes 477-500, le mapper `messagesData` reconstruit chaque message **sans copier les champs `replyToId` ni `repliedMessage`** :

```ts
const messagesData: Message[] = messages.map((m) => ({
  id, content, attachments, isSystemMessage, is_system,
  edited_at, author, timestamp,
  // ❌ replyToId et repliedMessage perdus ici
}));
```

Conséquence : sur Desktop/Tablette, `message.repliedMessage` est toujours `undefined` quand il arrive dans `ChatArea`, donc la condition `(message.repliedMessage || parsedReply)` ligne 1534 est fausse → aucune `RepliedLine` rendue. C'est exactement ce que montre l'image 3 (4 messages "Test" plats, sans aucun fil de réponse au-dessus), à comparer avec l'image 2 (Mobile) où le `RepliedLine` apparaît systématiquement.

## Plan de correction

### 1. Restaurer le bouton "Suivre" sur Mobile à sa place d'origine
Dans `src/components/mobile/MobileChatView.tsx` :
- Ajouter un bouton "Suivre" inline dans le header compact, visible uniquement quand `isAnnouncement && canFollowAnnouncements`.
- Position : entre le bloc titre et le bouton membres, taille adaptée mobile (`px-2 py-1 text-xs`, même style que Desktop : `border border-border/60 bg-muted/40`).
- Retirer l'entrée `'follow'` du tableau `moreActions` (lignes 166-171) pour ne pas dupliquer dans le kebab.
- Garder le `FollowChannelModal` déjà présent (lignes 384-404).

Sur Desktop/Tablette, le bouton est déjà en place dans `AnnouncementChannel.tsx` ligne 474-481 → aucun changement.

### 2. Corriger le mapper `messagesData` dans `src/pages/Index.tsx`
Ajouter les deux champs manquants dans l'objet retourné par `messages.map((m) => ({...}))` lignes 477-500 :

```ts
replyToId: (m as any).reply_to_id ?? null,
repliedMessage: (m as any).repliedMessage ?? null,
```

Résultat immédiat : sur Desktop/Tablette, chaque message qui a un `reply_to_id` en BDD verra sa `RepliedLine` rendue exactement comme sur Mobile (mêmes connecteur en L, mini-avatar, nom @auteur, preview du contenu cité), avec le même `indent={56}`, le même clic-pour-jump, le même fallback `deleted: true`.

### 3. Vérification fonctionnelle
- Mobile : le bouton "Suivre" apparaît dans le header d'un salon `announcement` à côté du titre.
- Desktop : envoyer une réponse → la `RepliedLine` s'affiche au-dessus du nouveau message, identique à l'image 2.
- Desktop : recharger la page → les anciennes réponses (avec `reply_to_id` en base) affichent maintenant la `RepliedLine` (avant ce fix : invisibles, comme image 3).
- Aucune régression sur les threads, DMs, annonces (déjà corrects).

## Détails techniques

- Aucune modification BDD. La colonne `reply_to_id` existe déjà sur `messages`.
- Aucun fichier auto-généré modifié (`types.ts`, `client.ts` intacts).
- Le type `Message` dans `src/types/app.ts` expose déjà `replyToId` et `repliedMessage` (lignes 65-67) — il manquait juste de les remplir dans le mapper.
- Le hook `useMessages` produit déjà la forme correcte (`reply_to_id` + `repliedMessage` résolu par batch) — le bug est purement dans la couche d'adaptation `Index.tsx`.

