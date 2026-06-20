## Objectif

Remplacer les `<ContextMenu>` inline dans `ChatArea.tsx` et `AnnouncementChannel.tsx` par le composant `UniversalMessageContextMenu` déjà utilisé partout ailleurs (DMConversation, ThreadView, VoiceChannelChat, MobileDMConversation…). Toutes les actions (clic droit desktop + long-press mobile) deviennent uniformes et chaque nouvelle entrée n'a plus qu'à être ajoutée au composant universel.

## Périmètre

- Comportement et UI strictement préservés (mêmes actions, mêmes permissions, mêmes labels visibles).
- Aucun changement de logique métier (handlers existants — `handleReply`, `handleCopyMessage`, `handlePinMessage`, `handleDelete`, `handlePublishMessage`, etc. — sont réutilisés tels quels).
- Aucun changement sur les autres vues déjà migrées.

## Étapes

### 1. `src/components/chat/ChatArea.tsx` — messages texte normaux (lignes ~1564-2054)

- Remplacer le bloc `<ContextMenu> … <ContextMenuContent> … </ContextMenu>` qui entoure le message par `<UniversalMessageContextMenu>` configuré ainsi :
  - `variant="message"`, `messageId={message.id}`, `isOwnMessage`, `isPinned={pinnedMessageIds.has(message.id)}`
  - `canAddReactions`, `canManageMessages`, `canManageReactions={canManageMessages}`, `hasReactions={(reactionsData?.[message.id]?.length ?? 0) > 0}`
  - Handlers : `onReply`, `onAddReaction`, `onCopyText`, `onCopyLink`, `onCopyId`, `onEdit` (si `isOwnMessage`), `onDelete` (si `isOwnMessage || canManageMessages`), `onPin` (si `canManageMessages`), `onCreateThread` (si `canCreateThreads`), `onReport`, `onViewReactions`, `onClearAllReactions`
  - L'enfant est le `<SwipeToReplyRow>…</SwipeToReplyRow>` existant.
- Supprimer la boîte de dialogue de suppression locale déclenchée par `handleContextDeleteSelect` pour ces messages : Universal gère sa propre `DeleteMessageDialog` (incluant le bypass SHIFT). Vérifier que `handleContextDeleteSelect` n'est plus utilisé par d'autres branches ; sinon le laisser pour les autres usages.
- Nettoyer les imports devenus inutiles (`ContextMenu`, `ContextMenuTrigger`, `ContextMenuContent`, `ContextMenuItem`, `ContextMenuSeparator`, `Popover/PopoverContent/PopoverTrigger` si plus utilisés, `Reply`, `Copy`, `Pin`, `Link`, `Hash`, `Pencil`, `Trash2`, `Flag`, `Eye`, `SmilePlus`, `StreamlineThreads`, `CONTEXT_MENU_REACTIONS`) — uniquement ceux qui ne servent plus ailleurs dans le fichier (les sondages et messages système conservent leur usage de `UniversalMessageContextMenu` + `extraItems`).

### 2. `src/components/channels/AnnouncementChannel.tsx`

#### 2a. Messages d'annonces (lignes ~841-1199)

- Remplacer le `<ContextMenu>` qui entoure la carte d'annonce par `<UniversalMessageContextMenu variant="message" …>` avec les mêmes handlers que ChatArea (`onReply`, `onCopyText`, `onCopyLink`, `onCopyId`, `onAddReaction`, `onEdit`, `onDelete`, `onPin` selon permissions, `onReport`).
- Pas d'`onCreateThread` ici (les annonces n'en ont pas dans le menu actuel) — laisser `undefined` pour cacher l'entrée.
- L'action « Publier aux abonnés » reste dans `UniversalMessageActions` via `customAction` (déjà en place) — aucun changement.
  - Note : Universal ne supporte pas une action personnalisée dans son menu ; si on veut aussi l'exposer dans le clic droit, on peut passer `extraItems` (un `ContextMenuItem` rendu uniquement en desktop). À faire seulement si l'utilisateur le demande — par défaut on garde l'iso comportementale exacte (publier reste sur la toolbar).

#### 2b. Message système « Thread créé » (lignes ~750-812)

- Remplacer le `<ContextMenu>` inline (qui n'expose qu'une suppression conditionnelle) par `<UniversalMessageContextMenu variant="system" canAddReactions={false}>` avec uniquement `onDelete`, `onCopyLink`, `onCopyId`. Permissions identiques (`user?.id === message.author.id || canManageMessages`).

#### 2c. Nettoyage imports

- Retirer les imports devenus inutiles (`ContextMenu`/`Trigger`/`Content`/`Item`/`Separator`, icônes lucide non utilisées ailleurs).

## Détails techniques

- Le typage de `UniversalMessageContextMenuProps` couvre tous les handlers nécessaires ; aucun changement au composant universel.
- Universal restitue le `children` via `<ContextMenuTrigger asChild>` (desktop) ou via un wrapper `div` avec `useLongPress` (mobile). Pour ChatArea le `children` reste `<SwipeToReplyRow>…</SwipeToReplyRow>` ; pour AnnouncementChannel c'est le `<div className="group message-hover …">`. Le comportement de hover et de swipe n'est pas affecté.
- `DeleteMessageDialog` est rendue par Universal — supprimer son équivalent local pour ces deux vues (uniquement les chemins migrés) afin d'éviter une double dialogue. Vérifier les autres usages avant suppression.
- La grille d'émojis « picker » du menu actuel de ChatArea est déjà présente dans Universal : iso visuelle conservée.

## Validation

1. Build (auto).
2. Vérifier visuellement (preview) :
   - Clic droit sur un message texte standard → menu universel s'ouvre, toutes les actions présentes.
   - SHIFT + clic sur Supprimer → suppression directe sans dialogue (comportement universel).
   - Clic droit sur une annonce → mêmes actions qu'avant (sans « Créer un thread »).
   - Clic droit sur le message système « Thread créé » par l'auteur ou un modérateur → entrée Supprimer.
   - Long-press mobile sur un message dans #général et #annonces → bottom sheet universel.
3. Lancer `rg "ContextMenu" src/components/chat/ChatArea.tsx src/components/channels/AnnouncementChannel.tsx` : ne doit plus rester que les usages de `UniversalMessageContextMenu` (et `extraItems` éventuels pour les sondages dans ChatArea).
