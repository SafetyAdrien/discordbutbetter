

## Objectif
Améliorer l'affichage des réactions sous chaque message :
1. **Bouton "+"** à côté des pills pour ajouter rapidement une réaction (picker emoji + emojis serveur).
2. **Aperçu des réacteurs** : afficher jusqu'à 3 avatars + noms d'affichage des personnes ayant réagi sur chaque pill (tooltip enrichi).
3. **"Voir plus"** : si > 3 réacteurs, ouvrir le `ReactionsViewerModal` existant filtré sur l'emoji concerné.

## Analyse

### État actuel (`src/components/chat/ReactionBar.tsx`)
- Pills affichent uniquement `emoji + count`.
- Tooltip simpliste : "Vous avez réagi" ou "X réaction(s)".
- `showAddButton` existe déjà avec `EmojiStickerPicker` — fonctionnel mais désactivé partout (`showAddButton={false}` dans ChatArea, DM, Threads, Media).
- Pas d'avatars ni noms affichés.

### Données disponibles
- `reactions: { user_id, emoji }[]` → groupées par emoji.
- Besoin de récupérer les profils (avatar_url, display_name) pour les user_ids.
- `useProfile` ou `useMembers` peut hydrater. Le plus simple : ajouter une requête batch dans `ReactionBar` via `profiles` table sur les user_ids présents.

## Solution

### 1. Réactiver le bouton "+" partout
Passer `showAddButton={true}` (ou retirer le prop, défaut `true`) dans :
- `src/components/chat/ChatArea.tsx` (2 emplacements)
- `src/components/dm/DMConversation.tsx`
- `src/components/threads/ThreadView.tsx`
- `src/components/channels/voice/VoiceChannelChat.tsx`
- `src/components/channels/MediaChannel.tsx` ou équivalent

Le picker `EmojiStickerPicker` est déjà branché avec `serverId` → emojis serveur inclus automatiquement.

### 2. Enrichir `ReactionBar.tsx`
- **Fetch profils** : ajouter `useQuery(['profiles-batch', userIds])` qui SELECT `id, username, display_name, avatar_url` depuis `profiles` pour tous les `user_id` présents dans `reactions`. Cache partagé.
- **Tooltip enrichi** sur chaque pill :
  - Mini-grille : 3 premiers avatars (12px) + display_name côte à côte.
  - Si > 3 : afficher "et X autres…" + bouton **"Voir plus"** qui appelle un callback `onViewReactors(emoji)`.
  - Sinon : juste la liste.
- Pour rester performant, le tooltip est rendu via `HoverCard` (Radix) plutôt que `Tooltip` simple (permet contenu interactif avec bouton cliquable).

### 3. Branchement "Voir plus"
- Ajouter prop `onViewReactors?: (emoji?: string) => void` à `ReactionBar`.
- Dans `ChatArea`/`DMConversation`/`ThreadView` : passer `(emoji) => { setReactionsViewerMessageId(message.id); setReactionsViewerInitialEmoji(emoji); }`.
- Étendre `ReactionsViewerModal` avec prop `initialEmoji?: string` pour pré-sélectionner l'onglet correspondant à l'ouverture.

### 4. Détails UI
- Avatar : `w-4 h-4 rounded-full` dans le hover card.
- Display name : texte sm, truncate.
- Bouton "+" : déjà stylisé, juste réactiver.
- Tooltip → HoverCard : `openDelay={200} closeDelay={100}`.

## Fichiers modifiés
- `src/components/chat/ReactionBar.tsx` — fetch profils, HoverCard avec avatars/noms, callback `onViewReactors`, par défaut `showAddButton=true`.
- `src/components/chat/ReactionsViewerModal.tsx` — accepter `initialEmoji` pour onglet par défaut.
- `src/components/chat/ChatArea.tsx` — 2 ReactionBar : retirer `showAddButton={false}`, passer `onViewReactors`, gérer `initialEmoji` dans state du modal.
- `src/components/dm/DMConversation.tsx` — idem.
- `src/components/threads/ThreadView.tsx` — idem.
- `src/components/channels/voice/VoiceChannelChat.tsx` — idem.
- `src/components/channels/MediaChannel.tsx` (et/ou composants posts média) — idem si applicable.

## Résultat
- Bouton "+" cliquable sur chaque message → picker complet avec emojis serveur.
- Hover sur un pill → mini-aperçu des 3 premiers réacteurs (avatar + nom).
- Si plus de 3 → bouton "Voir plus" ouvre le viewer modal directement sur l'emoji concerné.
- Cohérence sur toutes les surfaces (chat serveur, DM, threads, vocal, média).

