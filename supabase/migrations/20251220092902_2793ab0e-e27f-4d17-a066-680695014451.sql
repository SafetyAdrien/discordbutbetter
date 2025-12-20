-- Policy pour permettre aux modérateurs de supprimer les messages (y compris système)
CREATE POLICY "Moderators can delete messages with manage_messages permission"
ON public.messages
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM channels c
    WHERE c.id = messages.channel_id
    AND has_channel_permission(auth.uid(), c.id, 'manage_messages'::server_permission)
  )
);