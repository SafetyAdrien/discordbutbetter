

# Audit honnête : ce qui est intégré et ce qui bug réellement

## État RÉEL du code (vérifié fichier par fichier)

| Surface | replyToId envoyé | RepliedLine rendu | Statut |
|---|---|---|---|
| ChatArea (serveurs) | ✅ ligne 790 | ✅ ligne 1535 | Intégré |
| DMConversation | ✅ ligne 698 | ✅ ligne 438 | Intégré |
| AnnouncementChannel | ✅ ligne 364 | ✅ ligne 848 | Intégré |
| ThreadView | ✅ ligne 331 | ✅ ligne 809 | Intégré |
| Table `messages`, `dm_messages`, `thread_messages` | ✅ colonne `reply_to_id` présente | — | OK |

**Donc le code EST en place.** Si tu ne vois rien sur Desktop, ce n'est pas que la fonctionnalité est absente — c'est qu'un **bug d'intégration** la rend invisible/inopérante. Voici les vrais bugs identifiés.

## Bug #1 (CRITIQUE) — Erreur React `forwardRef` qui casse l'interaction

La console montre :
```
Warning: Function components cannot be given refs.
Check the render method of `UniversalMessageActions`.
Tooltip → div → UniversalMessageActions → SwipeToReplyRow → ContextMenuTrigger asChild
```

Cause : `<ContextMenuTrigger asChild>` passe une `ref` à son enfant direct `SwipeToReplyRow`, mais `SwipeToReplyRow` n'utilise PAS `forwardRef`. La ref est perdue. Conséquence : Radix ContextMenu / Tooltip enfants peuvent dysfonctionner, et le wrapper hover bug par intermittence (visible dans le replay : "Reaction buttons are added → removed" en 500ms).

**Correctif** : convertir `SwipeToReplyRow` en `forwardRef<HTMLDivElement, ...>` qui transmet la ref au `<div>` racine. Idem pour `UniversalMessageActions` si appelé via `asChild` ailleurs.

## Bug #2 — Le bouton Reply existe mais le hover est instable

`UniversalMessageActions` ligne 110-188 contient bien un bouton `<Reply>` au hover (ligne 152). Il s'affiche quand `isVisible={hoveredMessageId === message.id}`. Mais à cause du Bug #1, le hover state se déclenche/se reset rapidement, donnant l'impression que rien n'apparaît.

**Correctif** : une fois Bug #1 fixé, le bouton Reply hover sera stable. Action `onReply={() => handleReply(message)}` → `setReplyingTo(message)` → MessageInput affiche la bannière → envoi → `RepliedLine` rendu.

## Bug #3 — Bannière de réponse au-dessus du composer Desktop

Vérifier dans `ChatArea.tsx` ligne 1992 que la bannière `replyingTo` (avec aperçu auteur/contenu et bouton X) s'affiche bien. Identique pour `DMConversation.tsx` ligne 651, `ThreadView.tsx` ligne 997, `AnnouncementChannel.tsx` ligne 1160. Si la bannière n'apparaît pas, le clic Reply n'a pas d'effet visible → impression que "ça ne marche pas".

**Correctif** : s'assurer que la bannière a un styling visible (background contrasté, border-top, padding) sur Desktop. Aujourd'hui c'est `bg-muted/50` qui peut être quasi-invisible selon le thème.

## Bug #4 — `RepliedLine` invisible si `repliedMessage` est null à l'arrivée Realtime

Quand un AUTRE utilisateur répond à mon message, le flux Realtime de `useMessages` (ligne 207-289) refait une query pour résoudre `repliedMessage`. Si ce fetch échoue silencieusement (RLS, race), le message arrive SANS `repliedMessage` → `RepliedLine` ne s'affiche pas, alors que le `reply_to_id` est en BDD.

**Correctif** : ajouter un fallback `{ deleted: true, ... }` côté Realtime quand `replyData` est null, identique au code de `queryFn`. Et logger un warn si le fetch échoue (pas silencieux).

## Bug #5 — Sync Mobile/Desktop : action "Répondre" manquante dans le context menu Desktop

Vérification : `ContextMenuContent` dans ChatArea/DM/Thread n'inclut PAS systématiquement un item "Répondre". L'utilisateur clic-droit Desktop → pas d'option Reply → seul le bouton hover est disponible → frustrant si Bug #1 cache le hover.

**Correctif** : ajouter `<ContextMenuItem onClick={() => handleReply(message)}><Reply /> Répondre</ContextMenuItem>` en TÊTE du context menu sur les 4 surfaces.

## Plan d'action

1. **Convertir `SwipeToReplyRow` en `forwardRef`** (`/src/components/mobile/SwipeToReplyRow.tsx`) — transmet la ref au `<div>` racine.
2. **Convertir `UniversalMessageActions` en `forwardRef`** si la console le réclame (le warning vient de là).
3. **Ajouter un item "Répondre" en tête du context menu** dans :
   - `ChatArea.tsx`
   - `DMConversation.tsx`
   - `ThreadView.tsx`
   - `AnnouncementChannel.tsx`
4. **Renforcer la bannière `replyingTo`** au-dessus du composer (background `bg-surface-3` + border, padding visible).
5. **Robustifier le fallback Realtime** dans `useMessages.ts` (et idem `useDMMessages`, `useThreadMessages`) : toujours produire un `repliedMessage` même si le fetch échoue.
6. **Test fonctionnel manuel** : sur Desktop 1280px →
   - Hover sur message → bouton Reply visible et stable.
   - Clic Reply → bannière apparaît au-dessus du composer.
   - Envoi → `RepliedLine` apparaît au-dessus du nouveau message.
   - Clic-droit message → entrée "Répondre" en tête du menu.

## Détails techniques

- Le warning `forwardRef` est la **vraie cause** du dysfonctionnement perçu — pas une absence de code.
- Aucun changement BDD (les colonnes existent).
- Aucun fichier auto-généré touché.
- Si après ces 6 fixes tu ne vois toujours rien, ouvrir la console et copier l'erreur exacte au moment du clic Reply.

