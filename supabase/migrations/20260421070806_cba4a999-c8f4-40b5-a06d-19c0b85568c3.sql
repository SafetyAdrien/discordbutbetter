-- Add reply_to_id to channel messages
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.messages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_messages_reply_to_id ON public.messages(reply_to_id);

-- Add reply_to_id to DM messages
ALTER TABLE public.dm_messages
  ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.dm_messages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_dm_messages_reply_to_id ON public.dm_messages(reply_to_id);