-- Create pinned_messages table
CREATE TABLE public.pinned_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id uuid REFERENCES public.messages(id) ON DELETE CASCADE NOT NULL,
  channel_id uuid REFERENCES public.channels(id) ON DELETE CASCADE NOT NULL,
  pinned_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  pinned_at timestamp with time zone DEFAULT now(),
  UNIQUE(message_id, channel_id)
);

-- Enable RLS
ALTER TABLE public.pinned_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Members can view pinned messages"
  ON public.pinned_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.channels c
    WHERE c.id = channel_id AND is_server_member(auth.uid(), c.server_id)
  ));

CREATE POLICY "Admins can manage pinned messages"
  ON public.pinned_messages FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.channels c
    WHERE c.id = channel_id AND has_server_permission(auth.uid(), c.server_id, 'manage_messages')
  ));