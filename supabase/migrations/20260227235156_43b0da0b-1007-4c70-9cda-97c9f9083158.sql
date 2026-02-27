
CREATE TABLE public.media_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  file_url text NOT NULL,
  file_type text NOT NULL DEFAULT 'image',
  file_name text NOT NULL DEFAULT '',
  file_size bigint NOT NULL DEFAULT 0,
  alt_text text DEFAULT '',
  is_spoiler boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.media_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view media posts"
  ON public.media_posts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM channels c
    WHERE c.id = media_posts.channel_id
    AND is_server_member(auth.uid(), c.server_id)
  ));

CREATE POLICY "Members can create media posts"
  ON public.media_posts FOR INSERT
  WITH CHECK (
    auth.uid() = author_id
    AND EXISTS (
      SELECT 1 FROM channels c
      WHERE c.id = media_posts.channel_id
      AND is_server_member(auth.uid(), c.server_id)
    )
  );

CREATE POLICY "Authors can delete their media posts"
  ON public.media_posts FOR DELETE
  USING (auth.uid() = author_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.media_posts;
