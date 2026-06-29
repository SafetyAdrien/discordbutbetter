DROP POLICY IF EXISTS "Thread creators and admins can update threads" ON public.threads;

CREATE POLICY "Only manage_messages can update threads"
ON public.threads FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM channels c
    WHERE c.id = threads.channel_id
    AND has_server_permission(auth.uid(), c.server_id, 'manage_messages'::server_permission)
  )
);

DROP POLICY IF EXISTS "Thread creators and admins can delete threads" ON public.threads;

CREATE POLICY "Only manage_messages can delete threads"
ON public.threads FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM channels c
    WHERE c.id = threads.channel_id
    AND has_server_permission(auth.uid(), c.server_id, 'manage_messages'::server_permission)
  )
);