## 1. Cache-first immédiat (ThreadSpineLine & messages)

**ThreadSpine (`src/components/threads/ThreadSpine.tsx`)**
- Lire les threads en synchrone via `cacheGetSync('threads:<channelId>')` et les utiliser comme fallback de rendu tant que la query React Query n'a rien retourné, même si le hook `useThreads` renvoie un tableau vide.
- Supprimer les guards `isLoading` qui masquent la spine ; rendre directement à partir du cache.

**Messages salon (`src/hooks/useMessages.ts`) et thread-messages (`src/hooks/useThreadMessages.ts`)**
- Renforcer `placeholderData: cacheGetSync('messages:<id>')` en `initialData` pour seeding au tout premier render.
- Hydrater les 30 derniers messages depuis `localStorage` (slim mirror) puis compléter en arrière-plan par IDB + réseau via `useCacheRehydrate` (déjà étendu).
- S'assurer que `MessageList` ne renvoie pas de skeleton tant que `data && data.length > 0` (cache présent).

**Mirroring agressif (`src/lib/cache.ts`)**
- Ajouter `threads:` aux `SLIM_PREFIXES` pour qu'au moins 30 entrées tiennent en localStorage même quand la liste est grosse.

## 2. Salon Médias — affichage + détail latéral

**Cache invalidation après création (`useMediaPosts.ts`)**
- Vérifier que `createPost` invalide bien `['media-posts', channelId]` et insère optimistiquement le post en tête de liste (corrige "aucune publication n'apparaît").

**Cartes carrées (`MediaChannel.tsx`)**
- Grille `aspect-square`, `rounded-[15%]`, fond = média (img/vidéo/GIF en cover, autoplay muet pour vidéos/GIF).
- Suppression des overlays texte couvrants.

**Vue détail latérale (remplacement de `MediaPostDetailModal.tsx` par un panneau latéral)**
- Nouveau composant `MediaPostSidePanel` monté à droite de `ChatArea` (même slot que `ThreadView`).
- Layout vertical split : aperçu médias en haut, commentaires (`MediaComments`) en dessous.
- Carousel multi-images : flèches gauche/droite + indicateurs (pastilles) en bas.
- Zoom infini sur image : `react-zoom-pan-pinch` (ou wheel/pinch handler maison) avec pan, double-clic reset.

## 3. Salon Forum — même logique

- `ForumChannel.tsx` : panneau latéral identique pour ouvrir un post (titre + corps + commentaires en dessous, carousel pour pièces jointes multiples, zoom infini sur images).
- Réutiliser le composant `MediaPostSidePanel` paramétrable (mode `media` | `forum`).
- Vérifier la cache-invalidation après création de post forum (`useForumPosts` ou équivalent).

## 4. Marquage lu après mention / messages

- `useChannelUnreadCounts` / `useChannelMentionNotifications` / `useMarkChannelAsRead` : sur `markAsRead`, reset des deux compteurs (`unread_count` ET `mention_count`) côté optimistic + serveur.
- S'assurer que `ChannelList` lit ces deux compteurs et retire la pastille rouge ET le style "unread" (font-bold/blanc) une fois remis à zéro.
- Synchroniser via Realtime sur la table de read-state existante.

## 5. Helper Markdown → Paramètres utilisateur

**Retirer du chat**
- Supprimer la barre Markdown et son toggle dans `MessageInput.tsx` (lignes ~1000-1035) et le state `markdownBarOpen`.

**Ajouter dans Account Settings**
- Nouvelle section "Aide" dans `AccountSettings.tsx` (sidebar gauche).
- Sous-page "Markdown" : `MarkdownHelpPage.tsx` listant par catégorie, basé sur dfr.gg/wiki/interface/salons-textuels/markdown :
  - **Titres** (`# `, `## `, `### `, `-# ` discret) avec aperçu rendu
  - **Style de texte** (gras, italique, souligné, barré, spoiler)
  - **Code** (en ligne `` ` ``, bloc ```` ``` ```` avec coloration syntaxique + langues supportées)
  - **Citations** (`> `, `>>> `)
  - **Listes** (puces, numérotées, imbrication)
  - **Liens** (`[texte](url)`, masquage embed avec `<url>`)
  - **Mentions & emojis** (rappel `<@id>`, `:emoji:`)
- Chaque exemple : input markdown brut affiché à gauche + rendu via `MarkdownText` à droite.

## Détails techniques

- ThreadSpine + messages : reuse `cacheGetSync` du fichier `src/lib/cache.ts` déjà en place.
- Panel latéral : suivre le pattern de `ThreadView` (état dans `Index.tsx` ou via contexte de layout).
- Zoom : librairie `react-zoom-pan-pinch` (légère, déjà compatible Vite).
- Markdown help : aucun changement backend.

Aucune migration SQL nécessaire (la table de read-state existe déjà).
