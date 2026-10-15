-- Media channels become real Fluxer-style thread-only forums.
--
-- Fluxer models GUILD_MEDIA (16) as a THREAD-ONLY channel sharing the entire
-- GUILD_FORUM contract. There is no social feed, no stories, and no "duel"
-- concept in Fluxer — a media channel is a forum whose posts carry media.
--
-- This migration:
--   1. removes the custom "duel" feature (tables, columns, votes) entirely;
--   2. gives media_posts the same moderation/state surface as forum_posts
--      (pin, lock, archive, comment counters, activity timestamp), so a media
--      post behaves exactly like a forum post;
--   3. keeps `media_post_items` as the attachment list of a post.
--
-- Verified before writing: media_posts and media_post_duel_votes hold no rows in
-- production, so nothing is lost by dropping the duel structures.

-- ---------------------------------------------------------------------------
-- 1. Remove the "duel" feature
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS public.media_post_duel_votes;

ALTER TABLE public.media_posts
  DROP COLUMN IF EXISTS is_duel,
  DROP COLUMN IF EXISTS duel_expires_at;

-- ---------------------------------------------------------------------------
-- 2. Forum parity: same state columns as forum_posts
-- ---------------------------------------------------------------------------
ALTER TABLE public.media_posts
  ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS comment_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_activity_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Older posts: seed last_activity_at from created_at.
UPDATE public.media_posts
SET last_activity_at = created_at
WHERE last_activity_at > created_at;

-- Keep the same freshness behaviour as forum_posts.
CREATE OR REPLACE FUNCTION public.touch_media_post_activity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS media_post_touch_updated_at ON public.media_posts;
CREATE TRIGGER media_post_touch_updated_at
  BEFORE UPDATE ON public.media_posts
  FOR EACH ROW EXECUTE FUNCTION public.touch_media_post_activity();

-- Index supporting the forum list ordering (pinned first, then recent activity).
CREATE INDEX IF NOT EXISTS media_posts_channel_activity_idx
  ON public.media_posts (channel_id, is_pinned DESC, last_activity_at DESC);

-- Index supporting the tag filter, mirroring forum_posts usage.
CREATE INDEX IF NOT EXISTS media_posts_applied_tags_idx
  ON public.media_posts USING gin (applied_tags);

-- ---------------------------------------------------------------------------
-- 3. Comments behave like forum comments: bump the post's activity and counter.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_media_post_from_comment()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _post_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    _post_id := OLD.post_id;
  ELSE
    _post_id := NEW.post_id;
  END IF;

  -- media_post_comments are deleted outright (no soft-delete column), so a plain
  -- count is the accurate comment counter.
  UPDATE public.media_posts
  SET comment_count = (
    SELECT count(*) FROM public.media_post_comments
    WHERE post_id = _post_id
  ),
  last_activity_at = now()
  WHERE id = _post_id;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS media_post_comment_sync ON public.media_post_comments;
CREATE TRIGGER media_post_comment_sync
  AFTER INSERT OR DELETE ON public.media_post_comments
  FOR EACH ROW EXECUTE FUNCTION public.sync_media_post_from_comment();

-- Backfill the counter for posts that already have comments.
UPDATE public.media_posts p
SET comment_count = (
  SELECT count(*) FROM public.media_post_comments c WHERE c.post_id = p.id
)
WHERE EXISTS (SELECT 1 FROM public.media_post_comments c WHERE c.post_id = p.id);

-- ---------------------------------------------------------------------------
-- 4. Moderation policies, mirroring forum_posts
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Moderators can pin media posts" ON public.media_posts;
CREATE POLICY "Moderators can pin media posts"
  ON public.media_posts FOR UPDATE TO authenticated
  USING (
    public.has_channel_permission(auth.uid(), channel_id, 'pin_forum_posts'::server_permission)
    OR public.has_channel_permission(auth.uid(), channel_id, 'manage_forum_posts'::server_permission)
  )
  WITH CHECK (
    public.has_channel_permission(auth.uid(), channel_id, 'pin_forum_posts'::server_permission)
    OR public.has_channel_permission(auth.uid(), channel_id, 'manage_forum_posts'::server_permission)
  );

-- ---------------------------------------------------------------------------
-- 5. Media posts are part of the shared thread-only family.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.media_channels AS
SELECT
  c.id,
  c.server_id,
  c.name,
  c.description,
  c.position,
  fc.default_sort_order,
  fc.default_layout,
  fc.default_tag_setting,
  fc.require_tag,
  fc.hide_media_download_options
FROM public.channels c
LEFT JOIN public.forum_channel_config fc ON fc.channel_id = c.id
WHERE c.type = 'media'::channel_type;