

## Objectif

Deux extensions des salons média :
1. **Albums multi-médias** (carousel) : sélectionner plusieurs fichiers en une fois → un seul post avec navigation entre médias.
2. **Commentaires** : système identique aux annonces (texte + réactions + temps réel + suppression par auteur).

Ces deux features s'ajoutent sans casser l'existant (un post 1-fichier reste un cas dégénéré d'album à 1 média).

---

## 1. Schéma BDD

### Nouvelle table `media_post_items` (album)
Décompose les fichiers d'un post. Un post existant = 1 item.
```
- id uuid pk
- post_id uuid fk → media_posts(id) on delete cascade
- file_url text
- file_type text ('image' | 'video')
- file_name text
- file_size bigint
- alt_text text
- position int (ordre dans le carousel)
- created_at timestamptz
```
RLS : SELECT/INSERT/DELETE alignés sur `media_posts` (jointure via post_id → channel → server_member).

### Migration data : conserver les posts existants
Pour chaque ligne actuelle de `media_posts`, créer un `media_post_items` (position 0) avec les colonnes file_*. Les colonnes `file_url/file_type/file_name/file_size/alt_text` de `media_posts` deviennent **dépréciées** mais on les garde nullable pour ne rien casser.

### Nouvelle table `media_post_comments`
Calque exact d'`announcement_comments` :
```
- id uuid pk
- post_id uuid fk → media_posts(id) on delete cascade
- author_id uuid fk → profiles(id)
- content text
- created_at timestamptz
```
RLS : copie textuelle des 3 policies d'`announcement_comments` (SELECT/INSERT pour membre du serveur, DELETE pour auteur). Realtime activé.

### Nouvelle table `media_post_comment_reactions`
Calque exact d'`announcement_comment_reactions`. Realtime activé.

---

## 2. Hooks

### `useMediaPosts.ts` (modifié)
- Le SELECT joint maintenant `media_post_items(*)` ordonnés par `position`.
- Type `MediaPost` enrichi : `items: MediaPostItem[]`.
- `useCreateMediaPost` accepte `files: File[]` (au lieu d'un seul) :
  1. Upload N fichiers en parallèle (`Promise.all`)
  2. Insert `media_posts` (titre/description/spoiler — sans file_url)
  3. Insert N lignes `media_post_items` avec `position` croissante
- Optimistic update construit les `items` localement à partir des `URL.createObjectURL`.

### `useMediaComments.ts` (nouveau)
Copie 1:1 de `useAnnouncementComments / useAddAnnouncementComment / useDeleteAnnouncementComment` avec table `media_post_comments` et clé `['media-comments', postId]`.

### `useMediaCommentReactions.ts` (nouveau)
Copie 1:1 de `useCommentReactions.ts` avec table `media_post_comment_reactions`.

---

## 3. UI

### `CreateMediaPostModal.tsx` (modifié)
- Prop `files: File[]` (au lieu de `file: File`)
- Aperçu : carousel horizontal cliquable (thumbnails) + média principal au-dessus
- Bouton « Retirer » par fichier, bouton « + Ajouter » pour rajouter
- ALT text **par fichier** (input qui change selon le média actif du carousel)
- Reste : titre/description/spoiler inchangés

### `MediaChannel.tsx` (modifié)
- Input file passe à `multiple`
- Drag-drop accepte plusieurs fichiers : `Array.from(e.dataTransfer.files)`
- Vignette grille : si `items.length > 1`, afficher badge `📑 N` en haut-droite + n'afficher que `items[0]`
- Click sur une vignette → ouvre nouveau **`MediaPostDetailModal`**

### `MediaPostDetailModal.tsx` (nouveau)
- Lightbox plein écran avec :
  - Carousel principal (flèches gauche/droite + clavier) sur `items`
  - Compteur « 1 / N »
  - Sidebar/footer : titre, description, auteur, ReactionBar du post
  - Bloc commentaires : `<MediaComments postId={...} />` (composant clone de `AnnouncementComments`)
  - Bouton fermer + bouton supprimer (si auteur)

### `MediaComments.tsx` (nouveau)
Copie quasi-identique d'`AnnouncementComments.tsx`, branchée sur les hooks `useMediaComments`.

---

## 4. Stratégie cache & realtime
- 1 channel Supabase par table (pattern projet) : `media-posts-{channelId}`, `media-comments-rt-{postId}`, `media-comment-reactions-rt-{postId}`.
- Optimistic updates avec `mutationLockRef` pour les commentaires (cohérent avec le pattern projet).

---

## 5. Garanties « ne casse rien »
- Les anciens `media_posts` à 1 fichier sont migrés en items position 0 → l'UI les affiche comme un album à 1 élément (= identique à avant visuellement).
- Les hooks `useMediaPostReactions` / `useToggleMediaReaction` restent inchangés (réactions sur le post entier, pas par item).
- Aucune modification des permissions existantes (`upload_media`).
- Le bouton « Téléverser » et le drag-drop conservent le même flux : un seul fichier → comportement actuel ; plusieurs fichiers → carousel.

---

## Fichiers touchés

**Migration SQL**
- create `media_post_items`, `media_post_comments`, `media_post_comment_reactions` + RLS + realtime
- backfill des items depuis `media_posts` existants

**Modifiés**
- `src/hooks/useMediaPosts.ts` (multi-fichiers + items)
- `src/components/channels/media/CreateMediaPostModal.tsx` (carousel d'aperçu)
- `src/components/channels/MediaChannel.tsx` (input multiple, badge album, ouverture modal détail)

**Nouveaux**
- `src/hooks/useMediaComments.ts`
- `src/hooks/useMediaCommentReactions.ts`
- `src/components/channels/media/MediaPostDetailModal.tsx`
- `src/components/channels/media/MediaComments.tsx`

