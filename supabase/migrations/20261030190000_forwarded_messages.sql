-- Transfert de messages : metadonnees d'origine portees par le message transfere.
-- `forwarded_from` = { kind: 'channel'|'thread'|'dm', messageId, createdAt, channelId?, channelName?, serverId?,
--                      threadId?, threadName?, conversationId? }. Le contenu et les pieces jointes sont copies dans le message.
ALTER TABLE public.messages        ADD COLUMN IF NOT EXISTS forwarded_from jsonb;
ALTER TABLE public.thread_messages ADD COLUMN IF NOT EXISTS forwarded_from jsonb;
ALTER TABLE public.dm_messages     ADD COLUMN IF NOT EXISTS forwarded_from jsonb;

-- Droits d'envoi / de pieces jointes sur une liste de salons, en un seul appel (modale "Transferer a").
CREATE OR REPLACE FUNCTION public.get_channels_send_permissions(_channel_ids uuid[])
RETURNS TABLE(channel_id uuid, can_send boolean, can_attach boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id,
         public.has_channel_permission(auth.uid(), c.id, 'send_messages'::server_permission),
         public.has_channel_permission(auth.uid(), c.id, 'attach_files'::server_permission)
  FROM public.channels c
  WHERE c.id = ANY(_channel_ids)
    AND public.has_channel_permission(auth.uid(), c.id, 'view_channel'::server_permission);
$$;

REVOKE EXECUTE ON FUNCTION public.get_channels_send_permissions(uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_channels_send_permissions(uuid[]) TO authenticated;
