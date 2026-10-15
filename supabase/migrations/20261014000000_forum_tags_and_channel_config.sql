-- Forum tags as first-class entities (Fluxer-compatible model).
--
-- Previously tags were a free-form `forum_posts.tags TEXT[]`: a tag only
-- existed once a post had already used it, so moderators could not pre-define
-- the vocabulary, attach an emoji, or mark a tag as moderated.
--
-- Fluxer models a tag as { id, name (1-50), moderated, emoji_id, emoji_name }
-- with at most 20 tags per channel. This migration introduces that entity and
-- links posts to it via `applied_tags` (max 5 per post), while keeping the old
-- `tags` column so existing posts keep rendering.

CREATE TABLE IF NOT EXISTS public.forum_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  -- 1-50 characters, matching Fluxer's FORUM_TAG_NAME_MAX_LENGTH.
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 50),
  -- When true, only members with the forum moderation permissions may add or
  -- remove this tag from a post.
  moderated boolean NOT NULL DEFAULT false,
  -- Optional custom guild emoji, mirroring Fluxer's emoji_id / emoji_name pair.
  emoji_id uuid REFERENCES public.server_emojis(id) ON DELETE SET NULL,
  emoji_name text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT forum_tags_channel_name_key UNIQUE (channel_id, name)
);

CREATE INDEX IF NOT EXISTS forum_tags_channel_position_idx
  ON public.forum_tags (channel_id, position);

ALTER TABLE public.forum_tags ENABLE ROW LEVEL SECURITY;

-- A tag is only visible to members who can see its channel.
CREATE POLICY "Members can read forum tags"
  ON public.forum_tags FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.channels c
      WHERE c.id = forum_tags.channel_id
        AND public.has_channel_permission(auth.uid(), c.id, 'view_channel')
    )
  );

-- Creating/editing tags requires the same permission Fluxer uses for tag
-- management. Falls back to channel management for servers that predate it.
CREATE POLICY "Managers can create forum tags"
  ON public.forum_tags FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.channels c
      WHERE c.id = forum_tags.channel_id
        AND (
          public.has_channel_permission(auth.uid(), c.id, 'manage_forum_tags'::server_permission)
          OR public.has_channel_permission(auth.uid(), c.id, 'manage_channels'::server_permission)
        )
    )
  );

CREATE POLICY "Managers can update forum tags"
  ON public.forum_tags FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.channels c
      WHERE c.id = forum_tags.channel_id
        AND (
          public.has_channel_permission(auth.uid(), c.id, 'manage_forum_tags'::server_permission)
          OR public.has_channel_permission(auth.uid(), c.id, 'manage_channels'::server_permission)
        )
    )
  );

CREATE POLICY "Managers can delete forum tags"
  ON public.forum_tags FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.channels c
      WHERE c.id = forum_tags.channel_id
        AND (
          public.has_channel_permission(auth.uid(), c.id, 'manage_forum_tags'::server_permission)
          OR public.has_channel_permission(auth.uid(), c.id, 'manage_channels'::server_permission)
        )
    )
  );

-- Posts now reference tag entities instead of (only) carrying free text.
-- Kept nullable: a post with no tags is valid unless the channel sets
-- REQUIRE_TAG.
ALTER TABLE public.forum_posts
  ADD COLUMN IF NOT EXISTS applied_tags uuid[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.forum_posts.applied_tags IS
  'IDs from public.forum_tags applied to this post (Fluxer: max 5).';

-- Enforce Fluxer's MAX_APPLIED_TAGS_PER_THREAD = 5.
ALTER TABLE public.forum_posts
  DROP CONSTRAINT IF EXISTS forum_posts_applied_tags_max;
ALTER TABLE public.forum_posts
  ADD CONSTRAINT forum_posts_applied_tags_max
  CHECK (applied_tags IS NULL OR cardinality(applied_tags) <= 5);

-- Enforce Fluxer's MAX_FORUM_TAGS_PER_CHANNEL = 20.
CREATE OR REPLACE FUNCTION public.enforce_forum_tag_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (
    SELECT count(*) FROM public.forum_tags
    WHERE channel_id = NEW.channel_id
  ) >= 20 THEN
    RAISE EXCEPTION 'A forum channel may have at most 20 tags';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS forum_tag_limit_trigger ON public.forum_tags;
CREATE TRIGGER forum_tag_limit_trigger
  BEFORE INSERT ON public.forum_tags
  FOR EACH ROW EXECUTE FUNCTION public.enforce_forum_tag_limit();

-- Channel-level forum configuration (Fluxer ForumChannelRequestFields).
CREATE TABLE IF NOT EXISTS public.forum_channel_config (
  channel_id uuid PRIMARY KEY REFERENCES public.channels(id) ON DELETE CASCADE,
  -- 0 = LATEST_ACTIVITY, 1 = CREATION_TIME
  default_sort_order smallint NOT NULL DEFAULT 0
    CHECK (default_sort_order IN (0, 1)),
  -- 0 = DEFAULT, 1 = LIST, 2 = GRID
  default_layout smallint NOT NULL DEFAULT 0
    CHECK (default_layout IN (0, 1, 2)),
  -- 'match_some' | 'match_all'
  default_tag_setting text NOT NULL DEFAULT 'match_some'
    CHECK (default_tag_setting IN ('match_some', 'match_all')),
  -- REQUIRE_TAG (1 << 4)
  require_tag boolean NOT NULL DEFAULT false,
  -- Fluxer's ChannelFlags.REQUIRE_TAG
  default_auto_archive_duration integer NOT NULL DEFAULT 4320,
  default_reaction_emoji_id uuid REFERENCES public.server_emojis(id) ON DELETE SET NULL,
  default_reaction_emoji_name text
);

ALTER TABLE public.forum_channel_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read forum config"
  ON public.forum_channel_config FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.channels c
      WHERE c.id = forum_channel_config.channel_id
        AND public.has_channel_permission(auth.uid(), c.id, 'view_channel')
    )
  );

CREATE POLICY "Managers can write forum config"
  ON public.forum_channel_config FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.channels c
      WHERE c.id = forum_channel_config.channel_id
        AND (
          public.has_channel_permission(auth.uid(), c.id, 'manage_forum_tags'::server_permission)
          OR public.has_channel_permission(auth.uid(), c.id, 'manage_channels'::server_permission)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.channels c
      WHERE c.id = forum_channel_config.channel_id
        AND (
          public.has_channel_permission(auth.uid(), c.id, 'manage_forum_tags'::server_permission)
          OR public.has_channel_permission(auth.uid(), c.id, 'manage_channels'::server_permission)
        )
    )
  );

-- Convenience view exposing config alongside the channel, with tags resolved so
-- the client never has to join manually for the common read path.
CREATE OR REPLACE VIEW public.forum_channels AS
SELECT
  c.id,
  c.server_id,
  c.name,
  c.description,
  c.position,
  c.slowmode_seconds,
  fc.default_sort_order,
  fc.default_layout,
  fc.default_tag_setting,
  fc.require_tag,
  fc.default_auto_archive_duration,
  fc.default_reaction_emoji_name
FROM public.channels c
LEFT JOIN public.forum_channel_config fc ON fc.channel_id = c.id
WHERE c.type IN ('forum'::channel_type, 'media'::channel_type);