CREATE TABLE IF NOT EXISTS public.dm_polls (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.dm_conversations(id) ON DELETE CASCADE,
  author_id       uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  question        text NOT NULL,
  allow_multiple  boolean NOT NULL DEFAULT false,
  expires_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.dm_poll_options (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id   uuid NOT NULL REFERENCES public.dm_polls(id) ON DELETE CASCADE,
  text      text NOT NULL,
  emoji     text,
  position  int NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.dm_poll_votes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id    uuid NOT NULL REFERENCES public.dm_polls(id) ON DELETE CASCADE,
  option_id  uuid NOT NULL REFERENCES public.dm_poll_options(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (poll_id, option_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_dm_polls_conv        ON public.dm_polls(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_dm_poll_options_poll ON public.dm_poll_options(poll_id, position);
CREATE INDEX IF NOT EXISTS idx_dm_poll_votes_poll   ON public.dm_poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_dm_poll_votes_user   ON public.dm_poll_votes(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dm_polls        TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dm_poll_options TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dm_poll_votes   TO authenticated;
GRANT ALL ON public.dm_polls        TO service_role;
GRANT ALL ON public.dm_poll_options TO service_role;
GRANT ALL ON public.dm_poll_votes   TO service_role;

ALTER TABLE public.dm_polls        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_poll_votes   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dm_polls_select"  ON public.dm_polls;
DROP POLICY IF EXISTS "dm_polls_insert"  ON public.dm_polls;
DROP POLICY IF EXISTS "dm_polls_update"  ON public.dm_polls;
DROP POLICY IF EXISTS "dm_polls_delete"  ON public.dm_polls;

CREATE POLICY "dm_polls_select" ON public.dm_polls
  FOR SELECT USING (public.is_dm_participant(auth.uid(), conversation_id));

CREATE POLICY "dm_polls_insert" ON public.dm_polls
  FOR INSERT WITH CHECK (
    auth.uid() = author_id
    AND public.is_dm_participant(auth.uid(), conversation_id)
  );

CREATE POLICY "dm_polls_update" ON public.dm_polls
  FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "dm_polls_delete" ON public.dm_polls
  FOR DELETE USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "dm_poll_options_select" ON public.dm_poll_options;
DROP POLICY IF EXISTS "dm_poll_options_write"  ON public.dm_poll_options;

CREATE POLICY "dm_poll_options_select" ON public.dm_poll_options
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.dm_polls p
      WHERE p.id = dm_poll_options.poll_id
        AND public.is_dm_participant(auth.uid(), p.conversation_id)
    )
  );

CREATE POLICY "dm_poll_options_write" ON public.dm_poll_options
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.dm_polls p
      WHERE p.id = dm_poll_options.poll_id
        AND p.author_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.dm_polls p
      WHERE p.id = dm_poll_options.poll_id
        AND p.author_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "dm_poll_votes_select" ON public.dm_poll_votes;
DROP POLICY IF EXISTS "dm_poll_votes_insert" ON public.dm_poll_votes;
DROP POLICY IF EXISTS "dm_poll_votes_delete" ON public.dm_poll_votes;

CREATE POLICY "dm_poll_votes_select" ON public.dm_poll_votes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.dm_polls p
      WHERE p.id = dm_poll_votes.poll_id
        AND public.is_dm_participant(auth.uid(), p.conversation_id)
    )
  );

CREATE POLICY "dm_poll_votes_insert" ON public.dm_poll_votes
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.dm_polls p
      WHERE p.id = dm_poll_votes.poll_id
        AND public.is_dm_participant(auth.uid(), p.conversation_id)
    )
  );

CREATE POLICY "dm_poll_votes_delete" ON public.dm_poll_votes
  FOR DELETE USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_polls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_poll_options;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_poll_votes;

ALTER TABLE public.dm_polls        REPLICA IDENTITY FULL;
ALTER TABLE public.dm_poll_options REPLICA IDENTITY FULL;
ALTER TABLE public.dm_poll_votes   REPLICA IDENTITY FULL;