-- Backfill: turn the existing free-text tags into first-class tag entities.
--
-- `forum_posts.tags` is a free-form text[]: a tag only existed once someone had
-- already typed it. Fluxer models tags as channel-level entities so moderators
-- define the vocabulary up front. This promotes every distinct tag actually in
-- use to a `forum_tags` row and links each post to it via `applied_tags`.
--
-- Safe to re-run: the inserts are idempotent (unique on channel_id+name) and the
-- applied_tags update only fills posts that have none yet.

-- 1. Create one tag entity per (channel, distinct tag name) already in use.
INSERT INTO public.forum_tags (channel_id, name, moderated, position)
SELECT DISTINCT ON (p.channel_id, lower(t.tag))
       p.channel_id,
       -- Normalise to lower case, matching what CreateForumPostModal did client-side.
       lower(t.tag),
       false,
       row_number() OVER (
         PARTITION BY p.channel_id, lower(t.tag)
         ORDER BY lower(t.tag)
       ) - 1
FROM public.forum_posts p,
     unnest(p.tags) AS t(tag)
WHERE t.tag IS NOT NULL
  AND btrim(t.tag) <> ''
  -- Only on thread-only channels: forum and media.
  AND p.channel_id IN (SELECT id FROM public.channels WHERE type IN ('forum'::channel_type, 'media'::channel_type))
ON CONFLICT (channel_id, name) DO NOTHING;

-- 2. Point each post at the matching entities.
UPDATE public.forum_posts p
SET applied_tags = COALESCE(p.applied_tags, '{}') || resolved.ids
FROM (
  SELECT
    p2.id AS post_id,
    ARRAY(
      SELECT ft.id
      FROM unnest(p2.tags) AS t(tag)
      JOIN public.forum_tags ft
        ON ft.channel_id = p2.channel_id
       AND ft.name = lower(btrim(t.tag))
      LIMIT 5  -- Fluxer: MAX_APPLIED_TAGS_PER_THREAD
    ) AS ids
  FROM public.forum_posts p2
) AS resolved
WHERE p.id = resolved.post_id
  AND cardinality(resolved.ids) > 0
  AND (p.applied_tags IS NULL OR cardinality(p.applied_tags) = 0);

-- 3. Give every existing thread-only channel a config row so the UI has
--    something to read without relying on its client-side fallback.
INSERT INTO public.forum_channel_config (channel_id)
SELECT id FROM public.channels WHERE type IN ('forum'::channel_type, 'media'::channel_type)
ON CONFLICT (channel_id) DO NOTHING;