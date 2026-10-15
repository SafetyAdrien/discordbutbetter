-- Media channels become a Forum preset (Fluxer-aligned).
--
-- In Fluxer, GUILD_MEDIA (16) is a *thread-only* channel that shares the whole
-- Forum contract: same tags, same layouts, same sort orders — plus one extra
-- flag, HIDE_MEDIA_DOWNLOAD_OPTIONS, on top of REQUIRE_TAG.
--
-- This project's Media channel is a richer media feed (stories, albums, duels),
-- so we keep `media_posts` as the entity and add only the Forum *configuration
-- surface* + the two Fluxer channel flags. Nothing existing is dropped.

-- 1. Posts carry tags, exactly like forum posts.
ALTER TABLE public.media_posts
  ADD COLUMN IF NOT EXISTS applied_tags uuid[] DEFAULT '{}';

COMMENT ON COLUMN public.media_posts.applied_tags IS
  'IDs from public.forum_tags applied to this media post (Fluxer: max 5).';

ALTER TABLE public.media_posts
  DROP CONSTRAINT IF EXISTS media_posts_applied_tags_max;
ALTER TABLE public.media_posts
  ADD CONSTRAINT media_posts_applied_tags_max
  CHECK (applied_tags IS NULL OR cardinality(applied_tags) <= 5);

-- 2. Fluxer's ChannelFlags.HIDE_MEDIA_DOWNLOAD_OPTIONS (1 << 15): only settable on
--    media channels, never on forum (see settableChannelFlags in Fluxer).
ALTER TABLE public.forum_channel_config
  ADD COLUMN IF NOT EXISTS hide_media_download_options boolean NOT NULL DEFAULT false;

-- Enforce the Fluxer invariant: the flag is meaningless outside media channels.
-- A CHECK constraint cannot contain a subquery in PostgreSQL, so this is a
-- trigger instead (the test run on a scratch database caught exactly this).
CREATE OR REPLACE FUNCTION public.enforce_hide_download_only_on_media()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.hide_media_download_options
     AND NOT EXISTS (
       SELECT 1 FROM public.channels c
       WHERE c.id = NEW.channel_id AND c.type = 'media'::channel_type
     ) THEN
    RAISE EXCEPTION 'hide_media_download_options is only valid on media channels';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS hide_download_media_guard ON public.forum_channel_config;
CREATE TRIGGER hide_download_media_guard
  BEFORE INSERT OR UPDATE OF hide_media_download_options ON public.forum_channel_config
  FOR EACH ROW EXECUTE FUNCTION public.enforce_hide_download_only_on_media();

-- 3. Applying a tag to a media post must reference a tag of its own channel.
--    (forum_posts has the same invariant implicitly via the UI; here we enforce
--    it in the schema because media posts are inserted from several places.)
CREATE OR REPLACE FUNCTION public.enforce_media_tags_belong_to_channel()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _bad integer;
BEGIN
  IF NEW.applied_tags IS NULL OR cardinality(NEW.applied_tags) = 0 THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO _bad
  FROM public.forum_tags ft
  WHERE ft.id = ANY(NEW.applied_tags)
    AND ft.channel_id <> NEW.channel_id;

  IF _bad > 0 THEN
    RAISE EXCEPTION 'Media post tags must belong to the post channel';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS media_tags_channel_guard ON public.media_posts;
CREATE TRIGGER media_tags_channel_guard
  BEFORE INSERT OR UPDATE OF applied_tags ON public.media_posts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_media_tags_belong_to_channel();

-- 4. Seed config rows for existing media channels so the UI reads real values.
INSERT INTO public.forum_channel_config (channel_id)
SELECT id FROM public.channels WHERE type = 'media'::channel_type
ON CONFLICT (channel_id) DO NOTHING;