

# Plan de refonte — ChatInput universel, Header serveur, Notifications, Mobile

## 1. ChatInput universel — marges cohérentes
**Fichiers** : `src/components/chat/MessageInput.tsx`, `src/components/chat/ChatArea.tsx`, `src/components/dm/DMConversation.tsx`, `src/components/threads/ThreadView.tsx`

- **MessageInput.tsx** : Standardiser le padding du container non-compact pour tous les contextes. Remplacer la logique `tightLayout` / conditions par un padding uniforme : `px-4 pb-4 pt-2` (desktop) et `px-3 pb-3 pt-1` (mobile) — identique partout.
- **ChatArea.tsx** (l.1815) : Le wrapper `px-2 pb-2 pt-1` passe à `px-4 pb-4 pt-2` pour laisser une marge visible et identique sur les côtés et le bas.
- **DMConversation.tsx** (l.547-573) : Envelopper le `<MessageInput>` dans un div avec le même padding `px-4 pb-4 pt-2`.
- **ThreadView.tsx** (l.922) : Même wrapper padding autour du `<MessageInput>`.
- Supprimer la prop `tightLayout` devenue inutile.

## 2. Header serveur — centrage nom + déplacement InviteMember

**Fichier** : `src/components/layout/ChannelList.tsx` (l.1385-1551)

- **Centrer** le nom du serveur et l'icône Settings verticalement dans le header (sans bannière). Actuellement le nom est à gauche avec les icônes à droite. Restructurer : le bouton Popover du nom du serveur prend `flex-1 min-w-0 flex items-center justify-center`, l'icône Settings reste dans le même bloc.
- **Déplacer `UserPlus`** (l.1510-1525) du header vers la barre de recherche (l.1542-1551). L'icône apparaîtra à droite du bouton de recherche, dans le même container `px-2.5 py-2`.

## 3. Même changement InviteMember sur Mobile

**Fichier** : `src/components/mobile/MobileChannelListView.tsx`

- Dans les 3 variantes du header (bannière, sans bannière non-embedded, embedded) : retirer le bouton `UserPlus` du header.
- L'ajouter à côté de la barre de recherche (l.488-499), à droite dans le container.

## 4. Corriger les couleurs Mobile

**Fichier** : `src/components/mobile/MobileServersView.tsx`

- Remplacer `bg-sidebar` (l.270) par `bg-[hsl(var(--surface-server-list))]` pour aligner avec le desktop.
- Remplacer `bg-muted/50` des icônes par `bg-surface-3` comme en desktop.

**Fichier** : `src/components/mobile/MobileChannelListView.tsx`

- Remplacer `bg-[hsl(var(--surface-header))]` par `bg-[hsl(var(--surface-1))]` pour correspondre au ChannelList desktop.
- Vérifier `bg-card` (l.408) → `bg-[hsl(var(--surface-1))]`.

## 5. Badge notification (mentions) — Desktop & Mobile

Le système de mentions existe déjà via `useServerUnreadCounts` qui fournit `mentionCount` par serveur. Les badges sont déjà affichés sur les icônes serveur (desktop l.154-161, mobile l.118-121).

**Améliorations** :
- **Desktop `ServerList.tsx`** (l.154-161) : Repositionner le badge de `-bottom-1 -right-1` vers `-top-1.5 -right-1.5` (coin supérieur droit, comme demandé). Augmenter la taille min à `min-w-[22px] h-[22px]` pour un cercle plus visible. Ajouter `border-2 border-[hsl(var(--surface-server-list))]` pour le détacher visuellement.
- **Mobile `MobileServersView.tsx`** (l.118-121) : Aligner le style du badge avec le desktop : mêmes dimensions, même border, même positionnement `-top-1.5 -right-1.5`.
- Les deux utilisent déjà le realtime via `useServerUnreadCounts` → les badges sont déjà instantanés.

## Résumé des fichiers modifiés
1. `src/components/chat/MessageInput.tsx` — padding uniforme, suppression `tightLayout`
2. `src/components/chat/ChatArea.tsx` — wrapper padding
3. `src/components/dm/DMConversation.tsx` — wrapper padding
4. `src/components/threads/ThreadView.tsx` — wrapper padding
5. `src/components/layout/ChannelList.tsx` — centrage header, déplacement UserPlus
6. `src/components/mobile/MobileChannelListView.tsx` — déplacement UserPlus, correction couleurs
7. `src/components/mobile/MobileServersView.tsx` — correction couleurs, badge style
8. `src/components/layout/ServerList.tsx` — repositionnement badge notification

