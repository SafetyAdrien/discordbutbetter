-- Create threads table
CREATE TABLE public.threads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  archived BOOLEAN NOT NULL DEFAULT false,
  archived_at TIMESTAMP WITH TIME ZONE,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create thread_messages table
CREATE TABLE public.thread_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  edited_at TIMESTAMP WITH TIME ZONE,
  attachments JSONB DEFAULT '[]'::jsonb
);

-- Enable RLS
ALTER TABLE public.threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thread_messages ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_threads_channel_id ON public.threads(channel_id);
CREATE INDEX idx_threads_last_message_at ON public.threads(last_message_at DESC);
CREATE INDEX idx_thread_messages_thread_id ON public.thread_messages(thread_id);
CREATE INDEX idx_thread_messages_created_at ON public.thread_messages(created_at);

-- RLS Policies for threads
CREATE POLICY "Members can view threads in their server channels"
ON public.threads
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM channels c
    WHERE c.id = threads.channel_id
    AND is_server_member(auth.uid(), c.server_id)
  )
);

CREATE POLICY "Members can create threads"
ON public.threads
FOR INSERT
WITH CHECK (
  auth.uid() = created_by
  AND EXISTS (
    SELECT 1 FROM channels c
    WHERE c.id = threads.channel_id
    AND is_server_member(auth.uid(), c.server_id)
  )
);

CREATE POLICY "Thread creators and admins can update threads"
ON public.threads
FOR UPDATE
USING (
  auth.uid() = created_by
  OR EXISTS (
    SELECT 1 FROM channels c
    WHERE c.id = threads.channel_id
    AND has_server_permission(auth.uid(), c.server_id, 'manage_channels'::server_permission)
  )
);

CREATE POLICY "Thread creators and admins can delete threads"
ON public.threads
FOR DELETE
USING (
  auth.uid() = created_by
  OR EXISTS (
    SELECT 1 FROM channels c
    WHERE c.id = threads.channel_id
    AND has_server_permission(auth.uid(), c.server_id, 'manage_channels'::server_permission)
  )
);

-- RLS Policies for thread_messages
CREATE POLICY "Members can view thread messages"
ON public.thread_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM threads t
    JOIN channels c ON c.id = t.channel_id
    WHERE t.id = thread_messages.thread_id
    AND is_server_member(auth.uid(), c.server_id)
  )
);

CREATE POLICY "Members can send thread messages"
ON public.thread_messages
FOR INSERT
WITH CHECK (
  auth.uid() = author_id
  AND EXISTS (
    SELECT 1 FROM threads t
    JOIN channels c ON c.id = t.channel_id
    WHERE t.id = thread_messages.thread_id
    AND is_server_member(auth.uid(), c.server_id)
  )
);

CREATE POLICY "Authors can edit their thread messages"
ON public.thread_messages
FOR UPDATE
USING (auth.uid() = author_id);

CREATE POLICY "Authors can delete their thread messages"
ON public.thread_messages
FOR DELETE
USING (auth.uid() = author_id);

-- Function to update last_message_at on new thread message
CREATE OR REPLACE FUNCTION public.update_thread_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.threads
  SET last_message_at = NEW.created_at
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for updating last_message_at
CREATE TRIGGER update_thread_last_message_trigger
AFTER INSERT ON public.thread_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_thread_last_message();

-- Enable realtime for thread_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.thread_messages;