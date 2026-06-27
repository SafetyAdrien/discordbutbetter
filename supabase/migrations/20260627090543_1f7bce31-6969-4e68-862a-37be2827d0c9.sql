DROP POLICY IF EXISTS "dm_polls_update" ON public.dm_polls;
DROP POLICY IF EXISTS "dm_poll_votes_insert" ON public.dm_poll_votes;

CREATE POLICY "dm_polls_update" ON public.dm_polls
  FOR UPDATE
  USING (auth.uid() = author_id)
  WITH CHECK (
    auth.uid() = author_id
    AND public.is_dm_participant(auth.uid(), conversation_id)
  );

CREATE POLICY "dm_poll_votes_insert" ON public.dm_poll_votes
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.dm_polls p
      WHERE p.id = dm_poll_votes.poll_id
        AND public.is_dm_participant(auth.uid(), p.conversation_id)
    )
    AND EXISTS (
      SELECT 1 FROM public.dm_poll_options o
      WHERE o.id = dm_poll_votes.option_id
        AND o.poll_id = dm_poll_votes.poll_id
    )
  );