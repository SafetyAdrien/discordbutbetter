ALTER TABLE public.typing_indicators
  DROP CONSTRAINT typing_context,
  ADD CONSTRAINT typing_context CHECK (
    (channel_id IS NOT NULL AND conversation_id IS NULL AND thread_id IS NULL)
    OR (channel_id IS NULL AND conversation_id IS NOT NULL AND thread_id IS NULL)
    OR (channel_id IS NULL AND conversation_id IS NULL AND thread_id IS NOT NULL)
  );

DROP POLICY IF EXISTS "Members can view typing in their channels" ON public.typing_indicators;
CREATE POLICY "Members can view typing in their channels"
ON public.typing_indicators FOR SELECT
USING (
  (channel_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.channels c
    WHERE c.id = typing_indicators.channel_id
      AND public.is_server_member(auth.uid(), c.server_id)
  ))
  OR (conversation_id IS NOT NULL AND public.is_dm_participant(auth.uid(), conversation_id))
  OR (thread_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.threads t
    JOIN public.channels c ON c.id = t.channel_id
    WHERE t.id = typing_indicators.thread_id
      AND public.is_server_member(auth.uid(), c.server_id)
      AND public.can_access_thread(auth.uid(), t.id)
  ))
);
