-- Create dm_read_states table for tracking unread messages
CREATE TABLE public.dm_read_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.dm_conversations(id) ON DELETE CASCADE,
  last_read_at timestamptz DEFAULT now(),
  UNIQUE(user_id, conversation_id)
);

-- Enable RLS
ALTER TABLE public.dm_read_states ENABLE ROW LEVEL SECURITY;

-- RLS policy: users can manage their own read states
CREATE POLICY "Users can manage own read states" ON public.dm_read_states
  FOR ALL USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX idx_dm_read_states_user_conversation ON public.dm_read_states(user_id, conversation_id);