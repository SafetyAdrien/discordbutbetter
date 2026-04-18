-- 1. media_post_items
CREATE TABLE public.media_post_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.media_posts(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_type text NOT NULL DEFAULT 'image',
  file_name text NOT NULL DEFAULT '',
  file_size bigint NOT NULL DEFAULT 0,
  alt_text text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_media_post_items_post_id ON public.media_post_items(post_id, position);

ALTER TABLE public.media_post_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view media items"
ON public.media_post_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.media_posts mp
    JOIN public.channels c ON c.id = mp.channel_id
    WHERE mp.id = media_post_items.post_id
      AND public.is_server_member(auth.uid(), c.server_id)
  )
);

CREATE POLICY "Post author can insert items"
ON public.media_post_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.media_posts mp
    WHERE mp.id = media_post_items.post_id
      AND mp.author_id = auth.uid()
  )
);

CREATE POLICY "Author or mods can delete items"
ON public.media_post_items FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.media_posts mp
    JOIN public.channels c ON c.id = mp.channel_id
    WHERE mp.id = media_post_items.post_id
      AND (
        mp.author_id = auth.uid()
        OR public.has_channel_permission(auth.uid(), c.id, 'manage_messages'::server_permission)
      )
  )
);

-- 2. Backfill items from existing media_posts
INSERT INTO public.media_post_items (post_id, file_url, file_type, file_name, file_size, alt_text, position, created_at)
SELECT id, file_url, file_type, file_name, file_size, alt_text, 0, created_at
FROM public.media_posts
WHERE file_url IS NOT NULL AND file_url <> '';

-- 3. media_post_comments
CREATE TABLE public.media_post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.media_posts(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  edited_at timestamptz
);

CREATE INDEX idx_media_post_comments_post_id ON public.media_post_comments(post_id, created_at);

ALTER TABLE public.media_post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view comments"
ON public.media_post_comments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.media_posts mp
    JOIN public.channels c ON c.id = mp.channel_id
    WHERE mp.id = media_post_comments.post_id
      AND public.is_server_member(auth.uid(), c.server_id)
  )
);

CREATE POLICY "Members can insert comments"
ON public.media_post_comments FOR INSERT
WITH CHECK (
  author_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.media_posts mp
    JOIN public.channels c ON c.id = mp.channel_id
    WHERE mp.id = media_post_comments.post_id
      AND public.is_server_member(auth.uid(), c.server_id)
  )
);

CREATE POLICY "Author can delete own comment"
ON public.media_post_comments FOR DELETE
USING (author_id = auth.uid());

CREATE POLICY "Author can update own comment"
ON public.media_post_comments FOR UPDATE
USING (author_id = auth.uid());

-- 4. media_post_comment_reactions
CREATE TABLE public.media_post_comment_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.media_post_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (comment_id, user_id, emoji)
);

CREATE INDEX idx_mpc_reactions_comment_id ON public.media_post_comment_reactions(comment_id);

ALTER TABLE public.media_post_comment_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view comment reactions"
ON public.media_post_comment_reactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.media_post_comments mc
    JOIN public.media_posts mp ON mp.id = mc.post_id
    JOIN public.channels c ON c.id = mp.channel_id
    WHERE mc.id = media_post_comment_reactions.comment_id
      AND public.is_server_member(auth.uid(), c.server_id)
  )
);

CREATE POLICY "Members can add own reactions"
ON public.media_post_comment_reactions FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.media_post_comments mc
    JOIN public.media_posts mp ON mp.id = mc.post_id
    JOIN public.channels c ON c.id = mp.channel_id
    WHERE mc.id = media_post_comment_reactions.comment_id
      AND public.is_server_member(auth.uid(), c.server_id)
  )
);

CREATE POLICY "Users can delete own reactions"
ON public.media_post_comment_reactions FOR DELETE
USING (user_id = auth.uid());

-- 5. Realtime
ALTER TABLE public.media_post_items REPLICA IDENTITY FULL;
ALTER TABLE public.media_post_comments REPLICA IDENTITY FULL;
ALTER TABLE public.media_post_comment_reactions REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.media_post_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.media_post_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.media_post_comment_reactions;