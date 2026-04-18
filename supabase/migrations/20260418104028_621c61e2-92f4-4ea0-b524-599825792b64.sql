-- Allow moderators with manage_messages permission to delete any reaction on a message
CREATE POLICY "Moderators can delete any reaction"
ON public.reactions
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.messages m
    JOIN public.channels c ON c.id = m.channel_id
    WHERE m.id = reactions.message_id
      AND public.has_channel_permission(auth.uid(), c.id, 'manage_messages'::server_permission)
  )
);