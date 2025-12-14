-- Create thread_read_states table for notification tracking
CREATE TABLE public.thread_read_states (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  thread_id UUID NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, thread_id)
);

-- Enable RLS
ALTER TABLE public.thread_read_states ENABLE ROW LEVEL SECURITY;

-- RLS policy: Users can manage their own read states
CREATE POLICY "Users can manage own thread read states"
ON public.thread_read_states FOR ALL
USING (auth.uid() = user_id);