
-- ===== Canvas Live annotations =====
CREATE TABLE public.media_post_annotations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.media_posts(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.media_post_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  tool TEXT NOT NULL DEFAULT 'pen',
  color TEXT NOT NULL DEFAULT '#ff3366',
  size NUMERIC NOT NULL DEFAULT 4,
  -- Normalized points (0..1) as JSON array of {x,y}
  points JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_media_annotations_item ON public.media_post_annotations(item_id, created_at);
CREATE INDEX idx_media_annotations_post ON public.media_post_annotations(post_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_post_annotations TO authenticated;
GRANT ALL ON public.media_post_annotations TO service_role;

ALTER TABLE public.media_post_annotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view annotations on accessible posts"
ON public.media_post_annotations FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.media_posts mp
    JOIN public.channels c ON c.id = mp.channel_id
    LEFT JOIN public.server_members sm ON sm.server_id = c.server_id AND sm.user_id = auth.uid()
    WHERE mp.id = media_post_annotations.post_id
      AND (c.server_id IS NULL OR sm.user_id IS NOT NULL)
  )
);

CREATE POLICY "Users can create their own annotations"
ON public.media_post_annotations FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.media_posts mp
    JOIN public.channels c ON c.id = mp.channel_id
    LEFT JOIN public.server_members sm ON sm.server_id = c.server_id AND sm.user_id = auth.uid()
    WHERE mp.id = media_post_annotations.post_id
      AND (c.server_id IS NULL OR sm.user_id IS NOT NULL)
  )
);

CREATE POLICY "Users can delete their own annotations"
ON public.media_post_annotations FOR DELETE TO authenticated
USING (user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.media_post_annotations;
ALTER TABLE public.media_post_annotations REPLICA IDENTITY FULL;

-- ===== Visual Duels =====
ALTER TABLE public.media_posts
  ADD COLUMN IF NOT EXISTS is_duel BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS duel_expires_at TIMESTAMPTZ;

CREATE TABLE public.media_post_duel_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.media_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  item_id UUID NOT NULL REFERENCES public.media_post_items(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);
CREATE INDEX idx_duel_votes_post ON public.media_post_duel_votes(post_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_post_duel_votes TO authenticated;
GRANT ALL ON public.media_post_duel_votes TO service_role;

ALTER TABLE public.media_post_duel_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view duel votes on accessible posts"
ON public.media_post_duel_votes FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.media_posts mp
    JOIN public.channels c ON c.id = mp.channel_id
    LEFT JOIN public.server_members sm ON sm.server_id = c.server_id AND sm.user_id = auth.uid()
    WHERE mp.id = media_post_duel_votes.post_id
      AND (c.server_id IS NULL OR sm.user_id IS NOT NULL)
  )
);

CREATE POLICY "Users can cast their own vote before expiry"
ON public.media_post_duel_votes FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.media_posts mp
    WHERE mp.id = media_post_duel_votes.post_id
      AND mp.is_duel = true
      AND (mp.duel_expires_at IS NULL OR mp.duel_expires_at > now())
  )
);

CREATE POLICY "Users can change their vote before expiry"
ON public.media_post_duel_votes FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.media_posts mp
    WHERE mp.id = media_post_duel_votes.post_id
      AND mp.is_duel = true
      AND (mp.duel_expires_at IS NULL OR mp.duel_expires_at > now())
  )
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.media_post_duel_votes;
ALTER TABLE public.media_post_duel_votes REPLICA IDENTITY FULL;
