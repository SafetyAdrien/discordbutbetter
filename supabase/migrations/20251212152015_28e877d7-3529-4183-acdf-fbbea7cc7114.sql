-- Add explicit UPDATE policy for group DM conversations
CREATE POLICY "Participants can update group conversation metadata"
ON public.dm_conversations FOR UPDATE
USING (is_dm_participant(auth.uid(), id) AND is_group = true)
WITH CHECK (is_dm_participant(auth.uid(), id) AND is_group = true);

-- Add explicit DELETE policy (deny all)
CREATE POLICY "No direct conversation deletion"
ON public.dm_conversations FOR DELETE
USING (false);