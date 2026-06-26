## Ajustements Salon Médias (Feed + Duels)

### 1. Menu "3 points" (MoreHorizontal) — MediaPostCard
Remplacer le clic actuel (qui ouvre le side panel) par un vrai menu `DropdownMenu` (desktop) / `MobileMoreActionsSheet` (mobile, via `useBreakpoint`) avec les options :

- **Marquer comme lu** — flag local `media-read-posts` en `localStorage` (Set d'IDs), retire un éventuel point d'indicateur "non lu".
- **Modifier** — ouvre une `EditMediaPostModal` (titre, description, spoiler). Update via `media_posts` table. Auteur uniquement.
- **Copier l'identifiant** — Snowflake 18 chiffres via util existant `snowflake.ts`, `copyToClipboard`.
- **Copier le lien** — `${origin}/channels/${serverId}/${channelId}?post=${postId}`.
- **Répondre** — ouvre `CreateMediaPostModal` en mode "quote" : insère un bloc d'aperçu (titre + miniature + auteur) sous forme d'un nouvel item de post. Implémenté en passant une prop `quotedPost` au modal, ajouté en tête de la description sous forme markdown (citation `> @auteur — titre` + lien interne).
- **Supprimer le post** — confirm dialog existante (auteur ou `manage_messages`).
- **Voir les stats** — ouvre `MediaPostStatsModal` (nouveau composant) :
  - Compteur de commentaires + réactions (groupées par emoji).
  - Pour les duels : **tableau 2 colonnes** (Option A / Option B), liste des votants (avatar + display_name), pourcentage, total.

### 2. Barre d'actions — MediaPostCard
- Retirer le bouton `SmilePlus` séparé n'existe pas tel quel sur la carte, **mais** retirer la `ReactionBar` complète sous la carte (qui sert d'ajout libre d'emoji). Garder uniquement le bouton `Heart`.
- À côté de l'icône `Heart`, dans **le même container/background pill**, afficher le compteur `reactionCount` (toutes réactions confondues). Style : `inline-flex` avec fond `bg-muted` arrondi, gap réduit.
- À côté du `MessageCircle`, afficher le nombre exact de commentaires (`comments.length`) dans le même style pill.
- Supprimer le bloc "X réactions · Y commentaires" en dessous (redondant).
- `MediaPostSidePanel` : même traitement (Heart + count pill, MessageCircle + count pill, suppression de la `ReactionBar` libre).

### 3. Duels Visuels — correctif vote
Bug actuel : `useCastDuelVote` fait `delete + insert` sans détecter si l'utilisateur reclique sur le **même item** (perçu comme "impossible de retirer"). Et le changement A↔B fonctionne en base mais l'UX ne le signale pas.

Correctif `useMediaDuel.ts` :
- Si `itemId` cliqué === vote actuel ⇒ **delete seul** (toggle off, retire le vote).
- Sinon ⇒ delete + insert (switch). Optimistic update mis à jour en conséquence.
- `MediaDuelView` : surligner visuellement le côté voté + tooltip "Cliquer à nouveau pour retirer / cliquer sur l'autre pour changer".

### 4. Bouton "Stats Duel" en remplacement de Trash2
Sur les posts de type **duel** uniquement, dans le header de la carte/side panel, remplacer l'icône `Trash2` (qui reste dispo dans le menu 3 points) par un bouton `BarChart3` qui :

- Déclenche une **animation d'ouverture horizontale (flip 3D)** : la carte pivote sur l'axe Y avec `transform-style: preserve-3d` + `rotateY(180deg)` (durée 600ms `cubic-bezier(0.4, 0, 0.2, 1)`).
- Le **dos de la carte** garde exactement le même style (header, fond `surface-2`, bordure, rayon) mais affiche :
  - Header identique (avatar + titre).
  - Un graphique moderne (barres horizontales animées via Recharts `BarChart` + `Cell` pour couleurs A/B) : votes par option, total, % global.
  - Compteur de commentaires + réactions.
  - Bouton "Retour" qui rejoue l'animation inverse.
- Réutilisable : nouveau composant `MediaDuelStatsBack.tsx`, monté inconditionnellement (deux faces du flip).

### Composants & Fichiers (technique)

**Créés**
- `src/components/channels/media/MediaPostStatsModal.tsx` — modal stats générale (tableau votants groupés par option pour duels).
- `src/components/channels/media/EditMediaPostModal.tsx` — édition titre/description/spoiler.
- `src/components/channels/media/MediaDuelStatsBack.tsx` — face arrière de carte duel (graphique Recharts).
- `src/components/channels/media/MediaPostActionsMenu.tsx` — wrapper Dropdown/Sheet partagé Card + SidePanel.

**Modifiés**
- `src/components/channels/media/MediaPostCard.tsx` — menu 3 points, pills Heart/Comment, flip duel, retrait ReactionBar.
- `src/components/channels/media/MediaPostSidePanel.tsx` — même menu 3 points, pills, retrait ReactionBar libre.
- `src/components/channels/media/MediaDuelView.tsx` — UX toggle/switch + label dynamique.
- `src/hooks/useMediaDuel.ts` — logique toggle-off si reclic même item (mutationFn + onMutate).
- `src/hooks/useMediaPosts.ts` — ajout `useUpdateMediaPost` (titre/description/spoiler).

**Aucun changement DB requis** (utilise `media_posts`, `media_post_duel_votes`, `media_post_comments`, `media_post_reactions` existants + jointure `profiles` pour noms/avatars dans stats).

### Hors-scope
- "Marquer comme lu" reste local (pas de table dédiée — cohérent avec le système actuel des `media-saved-posts`).
- "Répondre" produit un nouveau post avec citation markdown, pas un fil de réponse natif (système Threads existant non réutilisé ici).