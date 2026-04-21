ALTER TABLE public.thread_messages
ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.thread_messages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_thread_messages_reply_to_id ON public.thread_messages(reply_to_id);