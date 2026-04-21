

# Système de réponse — Annonces & Médias (commentaires)

Étendre l'expérience Discord-like (mini-avatar, pseudo coloré, ligne courbe, troncature avec fade-out, jump-to) aux **commentaires** des annonces et des posts médias. Le **Forum** est exclu pour cette itération car les posts/threads forum ne sont pas encore implémentés (placeholder).

## Ce que l'utilisateur verra

### Commentaires d'annonce et de post média
- Bouton **Répondre** (icône `Reply`) au survol d'un commentaire, à côté du bouton supprimer
- Sur mobile : long-press → mini menu `{ Répondre, Supprimer }` avec haptique léger
- Au clic : **barre de réponse** au-dessus de l'input avec mini-avatar + `@auteur` + aperçu tronqué (64 car., fade-out CSS) + bouton ✕
- Le commentaire-réponse affiche la **`RepliedLine`** au-dessus :
  - Connecteur SVG en L (┌─) ancré sur l'avatar du commentaire
  - Mini-avatar fidèle de l'auteur cité (résolu via `reply_to_id`)
  - Pseudo `@` + couleur de rôle serveur (calculée via `useMembers` + `useRoles`)
  - Aperçu cliquable → scroll + highlight pulsant 1.5s vers le commentaire original
- **Commentaire supprimé** : `Commentaire original supprimé` en italique, avatar gris, non cliquable

### Forum
- Bannière discrète au-dessus du placeholder : *"Le système de réponse sera disponible avec la prochaine version des posts forum."*

## Détails techniques

### 1. Migrations DB

```sql
-- Annonces
ALTER TABLE public.announcement_comments
  ADD COLUMN reply_to_id uuid REFERENCES public.announcement_comments(id) ON DELETE SET NULL;
CREATE INDEX idx_announcement_comments_reply_to_id 
  ON public.announcement_comments(reply_to_id);

-- Médias
ALTER TABLE public.media_post_comments
  ADD COLUMN reply_to_id uuid REFERENCES public.media_post_comments(id) ON DELETE SET NULL;
CREATE INDEX idx_media_post_comments_reply_to_id 
  ON public.media_post_comments(reply_to_id);
```
- `ON DELETE SET NULL` → suppression du commentaire cible transforme la réponse en "supprimé"
- RLS héritée (aucune règle additionnelle)

### 2. Types & hooks

**Nouveau type partagé** :
```ts
export interface RepliedCommentSnapshot {
  id: string;
  content: string;
  deleted?: boolean;
  author: { id: string; display_name: string; avatar_url: string | null } | null;
}
```

**`useAnnouncements.ts`** :
- Étendre `AnnouncementComment` : `reply_to_id?: string | null`, `repliedComment?: RepliedCommentSnapshot | null`
- `useAnnouncementComments` : après le fetch principal, batch-resolve via `IN (replyIds)` joint avec `profiles`, attacher `repliedComment` à chaque commentaire (ceux qui ne reviennent pas → `deleted: true`)
- `useAddAnnouncementComment` : accepte `replyToId?: string` et l'envoie à l'INSERT (+ optimistic update conserve le repliedComment)

**`useMediaComments.ts`** : même refactor (champs + batch fetch + `replyToId` mutation)

### 3. Composant `RepliedLine` — réutilisé tel quel
Le composant accepte déjà `repliedMessage` (id, content, author). On mappe `repliedComment` → cette forme. Pas d'attachments à gérer (commentaires texte uniquement). Aucune modification du composant.

### 4. Refactor des composants

**`AnnouncementComments.tsx`** :
- État `replyingTo: AnnouncementComment | null`
- Bouton Reply (icône `Reply` Lucide) à côté du Trash, visible au hover
- Preview de réponse au-dessus de l'input (Avatar 16×16 + `@auteur` + texte fade-out + ✕)
- À l'envoi : `addComment.mutate({ content, replyToId: replyingTo?.id })` + reset state
- Au-dessus de chaque commentaire ayant `repliedComment` : rendu `<RepliedLine>` avec :
  - `commentRefs: Map<id, HTMLElement>` mémoïsé pour le scroll
  - `onJump(id)` → scroll + classe `.highlight-pulse` 1.5s
- Couleur du pseudo : nouveau hook léger inline ou réutilisation du calcul `useMembers + useRoles` déjà en place côté chat

**`MediaComments.tsx`** : mêmes changements

**`ForumChannel.tsx`** : ajout d'une bannière info au-dessus de l'empty state (pas de logique réelle)

### 5. Mobile
- Long-press 300ms via `useLongPress` existant → menu `{ Répondre, Supprimer }`
- Haptique léger via `triggerHaptic('light')`
- Touch target ≥ 32×32 pour le bouton Reply

### 6. Performance & a11y
- 1 seule requête `IN (...)` par hook pour résoudre les `repliedComment`
- `useMemo` pour `commentRefs` et la map des replies
- `aria-label="Répondre à {auteur}"` sur le bouton Reply
- Preview : focus ring sur ✕, Escape annule
- Réutilise classe `.highlight-pulse` existante

### 7. Fichiers

**Migrations**
- `supabase/migrations/{ts}_add_reply_to_id_to_announcement_comments.sql`
- `supabase/migrations/{ts}_add_reply_to_id_to_media_post_comments.sql`

**Modifiés**
- `src/hooks/useAnnouncements.ts`
- `src/hooks/useMediaComments.ts`
- `src/components/channels/announcement/AnnouncementComments.tsx`
- `src/components/channels/media/MediaComments.tsx`
- `src/components/channels/ForumChannel.tsx` (bannière info)

**Inchangé** : `RepliedLine.tsx` (réutilisé)

**Migration DB requise.**

