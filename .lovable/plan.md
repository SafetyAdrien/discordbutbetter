

## Problèmes identifiés

### Bug #1 — Message système redondant pour les fils créés depuis le composer
Dans `useCreateThread` (ligne 184-194), un message système `[SYSTEM:THREAD_CREATED:...]` est inséré **systématiquement** dès qu'un fil public est créé. Or quand l'utilisateur publie une annonce avec l'option "Créer un fil" activée, le fil est déjà attaché à l'annonce via `messageId` et apparaît naturellement sous le message via le bloc `threadsByMessageId.has(message.id)` (ligne 957-965). Résultat : on voit **deux** embeds (l'annonce avec son fil intégré + un message système séparé).

→ **Le message système ne doit apparaître QUE lorsque le fil est créé sans `messageId`** (ex. via le bouton "Créer un Thread" dans le header).

### Bug #2 — Ouverture du fil ne fonctionne pas dans les annonces
Dans `Index.tsx` (ligne 600 et ligne 692), le panneau `ThreadView` est rendu et la zone de chat est rétrécie **uniquement quand `channelForChat?.type === 'text'`**. Les salons d'annonce appellent bien `onSelectThread` → `setActiveThreadId(threadId)` mais aucun panneau ne s'ouvre car la condition exclut le type `'announcement'`.

→ Étendre les deux conditions à `type === 'text' || type === 'announcement'`.

---

## Solution

### Fix #1 — `src/hooks/useThreads.ts`
Modifier `useCreateThread` pour insérer le message système **seulement si `!messageId`** (création autonome) :
```ts
if (!isPrivate && !messageId) {
  await supabase.from('messages').insert({ ... });
}
```
Quand `messageId` est fourni, le fil est lié au message porteur ; l'embed sous l'annonce suffit.

### Fix #2 — `src/pages/Index.tsx`
Étendre la condition d'affichage du `ThreadView` aux salons d'annonce :
- Ligne 600 (className width): `channelForChat.type === 'text' || channelForChat.type === 'announcement'`
- Ligne 601 (style flex): même condition
- Ligne 692 (rendu de `<ThreadView />` et de la poignée de redimensionnement): même condition

Aucun changement nécessaire dans `AnnouncementChannel.tsx` — il propage déjà `onSelectThread`, `activeThreadId` et `onCloseThread`.

---

## Fichiers modifiés
1. `src/hooks/useThreads.ts` — n'insérer le message système que si aucun `messageId` n'est fourni
2. `src/pages/Index.tsx` — autoriser l'affichage du panneau `ThreadView` pour `type === 'announcement'`

## Résultat
- ✅ Plus de message système redondant quand une annonce est publiée avec un fil intégré
- ✅ Le message système `ThreadSystemMessage` apparaît toujours quand un fil est créé via le bouton du header (sans message porteur)
- ✅ Cliquer sur un fil dans un salon d'annonce ouvre le panneau split-view comme dans les salons textuels

