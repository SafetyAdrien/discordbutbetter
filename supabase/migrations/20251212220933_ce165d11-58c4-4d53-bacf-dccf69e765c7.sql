-- Create server_read_states table for tracking unread messages per server
CREATE TABLE public.server_read_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, server_id)
);

-- Enable RLS
ALTER TABLE public.server_read_states ENABLE ROW LEVEL SECURITY;

-- Users can manage their own read states
CREATE POLICY "Users can manage own server read states"
  ON public.server_read_states FOR ALL
  USING (auth.uid() = user_id);