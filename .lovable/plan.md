
# Refonte du canal Media — Feed social + Canvas Live + Duels visuels

Trois chantiers, livrés en trois phases pour limiter les risques. Tout reste cache-first, realtime, sans IA.

---

## Phase 1 — Interface "Feed social" (remplacement de la grille)

Transforme le canal Media en fil vertical immersif inspiré d'Instagram/TikTok, mobile-first mais excellent en desktop.

### Structure visuelle
- **En haut** : barre horizontale de "Stories" (posts < 24h) — pastilles circulaires avec aperçu et ring dégradé pour les non-vus. Clic = visionneuse plein écran avec auto-advance + barres de progression.
- **Corps** : fil vertical **une colonne centrée** (max-w ~600px desktop, full-width mobile), chaque carte = un post.
- **Carte post** :
  - Header compact : avatar + auteur + date relative ("il y a 2h") + menu `⋯`.
  - Média plein cadre, ratio préservé (max-h 80vh), carousel swipe si album (dots en bas).
  - Double-tap = ❤️ (animation cœur). Long-press image = ouvre InfiniteZoom.
  - Barre d'actions sous le média : ❤️ React · 💬 Commenter · 🔁 Repartager dans un autre salon · 🔖 Sauvegarder.
  - Compteurs : "234 réactions · 12 commentaires".
  - Titre + description (clamp 2 lignes, "voir plus").
  - 2-3 derniers commentaires inline + champ "Ajouter un commentaire…".
- **Lecture vidéo auto** : IntersectionObserver — la vidéo visible >60% se lance muted, se met en pause sinon. Bouton son en overlay.
- **Side panel** : conservé pour vue "détail/zoom" déclenchée explicitement (icône loupe ou clic sur média) — pas pour la lecture standard.

### Bascule de vue
- Header du canal : 3 modes au lieu de 2 → **Feed** (défaut) · **Grille** (l'actuelle) · **Liste**.
- Préférence stockée par utilisateur (localStorage par channel).

### Touches feed
- Scroll snap doux entre cartes (option utilisateur "lecture immersive").
- Skeleton cards cache-first (placeholder du hook existant).
- FAB de création conservé.

---

## Phase 2 — Canvas Live (annotation collaborative temps réel)

Une couche d'annotation collaborative qui se superpose à n'importe quelle image d'un post Media.

### UX
- Bouton **🎨 Annoter** dans le side panel d'un média image.
- Ouvre la **salle Canvas** : l'image en fond, par-dessus un canvas transparent partagé. Présence en haut (avatars des participants actifs avec curseurs colorés temps réel).
- **Outils** (barre verticale gauche) : Sélection · Crayon (taille/couleur) · Surligneur · Flèche · Rectangle · Texte · Sticker emoji · Gomme · Undo/Redo.
- **Couleur par utilisateur** assignée (palette stable basée sur user_id).
- **Couches** : chaque trait appartient à son auteur, signé. Filtre "n'afficher que mes annotations / tout / par auteur".
- **Snapshot** : "Enregistrer l'annotation" → crée un nouveau post Media (image + overlay aplati) avec mention `Basé sur @auteur·original`.
- **Mode lecture** : replay chronologique des coups de pinceau (timeline en bas, lecture x1/x2/x4) — sympa pour reviews de design.

### Realtime & technique
- Table `media_canvas_strokes` : `id, post_id, item_id, author_id, tool, color, size, path_json, created_at`.
- Broadcast Supabase Realtime channel `canvas:${item_id}` pour les curseurs (éphémères, pas persistés).
- `postgres_changes` pour les traits (persistés, rejoués à l'ouverture).
- Throttle envoi curseur 30ms, envoi trait à fin de geste (pas pendant).
- Permission : nouvelle perm canal `annotate_media` (par défaut héritée de `send_messages`).

### Limites posées dès le départ
- Pas de canvas sur vidéo en phase 2 (juste images).
- Limite 5000 traits / image (purge auto plus ancien si dépassé, avec avertissement).
- Limite 10 collaborateurs simultanés (sinon "salle pleine").

---

## Phase 3 — Duels visuels (battles A/B)

Type de post Media spécial : "Duel" — opposition de 2 médias avec vote temps réel.

### UX
- Bouton **⚔️ Lancer un duel** dans le composer Media (à côté de "Téléverser").
- Modal : 2 zones de dépôt côte à côte (Option A / Option B), titre obligatoire, description optionnelle, durée du vote (1h / 6h / 24h / 7j / illimité).
- Post duel affiché dans le feed :
  - 2 médias **côte à côte** (stack vertical sur mobile), ratio préservé.
  - Sous chaque média : barre de vote animée (% temps réel) + bouton "Voter A" / "Voter B".
  - Un vote = un utilisateur, changeable jusqu'à expiration.
  - Compteur global ("847 votes · se termine dans 3h22").
  - Après expiration : "winner" mis en avant avec un ruban 🏆.
- Page détail (side panel) : graphique de l'évolution des votes dans le temps, top commentaires par camp (filtre "Team A / Team B / Tous").

### Realtime & technique
- Tables :
  - `media_duels` : `id, post_id, title, description, option_a_item_id, option_b_item_id, ends_at, winner_side, total_votes_a, total_votes_b, created_at`.
  - `media_duel_votes` : `id, duel_id, user_id, side ('a'|'b'), created_at` — unique `(duel_id, user_id)`.
- Triggers SQL maintiennent `total_votes_a/b` (insert/update/delete).
- Realtime sur les deux tables → progression animée live.
- Edge function cron léger (ou trigger à la lecture) pour figer `winner_side` à expiration.

### Garde-fous
- Pas d'auto-suppression : duel expiré reste consultable.
- Spoiler désactivé pour les duels (l'intérêt est de comparer).
- Permission héritée d'`upload_media`.

---

## Détails techniques transverses

### Fichiers à créer
- `src/components/channels/media/MediaFeed.tsx` (vue Feed)
- `src/components/channels/media/MediaStoriesBar.tsx` + `MediaStoryViewer.tsx`
- `src/components/channels/media/MediaPostCard.tsx`
- `src/components/channels/media/canvas/CanvasRoom.tsx` + `CanvasToolbar.tsx` + `CanvasCursors.tsx`
- `src/components/channels/media/duels/CreateDuelModal.tsx` + `DuelCard.tsx` + `DuelDetailPanel.tsx`
- `src/hooks/useMediaCanvasStrokes.ts`
- `src/hooks/useMediaDuels.ts` + `useMediaDuelVote.ts`

### Fichiers à modifier
- `src/components/channels/MediaChannel.tsx` : ajouter mode `feed`, intégrer Stories, bouton Duel.
- `src/components/channels/media/MediaPostSidePanel.tsx` : ajouter bouton "Annoter".
- `src/components/channels/media/CreateMediaPostModal.tsx` : split en deux entrées (Post / Duel).
- `src/constants/permissions.ts` : ajouter `annotate_media`.

### Backend (migrations Supabase)
- `media_canvas_strokes` + RLS + GRANT + REALTIME.
- `media_duels` + `media_duel_votes` + triggers compteurs + RLS + GRANT + REALTIME.
- Storage : un bucket `media-canvas-snapshots` (privé, RLS sur premier dossier = `auth.uid()`).

### Cache & realtime
- Tous les nouveaux hooks suivent le pattern existant : `placeholderData` via `cacheGetSync`, `cacheSetAsync` sur succès, subscription `postgres_changes` ciblée par `channel_id` / `post_id`.
- Curseurs canvas = broadcast éphémère (non persisté, non caché).

---

## Ordre d'exécution proposé
1. **Phase 1** seule d'abord (impact visuel immédiat, zéro backend).
2. **Phase 3 (Duels)** ensuite (backend modéré, valeur produit forte).
3. **Phase 2 (Canvas Live)** en dernier (le plus complexe, mérite sa propre itération).

Confirme l'ordre (ou demande "tout d'un coup") et je passe en build.
