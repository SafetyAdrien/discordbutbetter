-- Create thread_followers table for follow/unfollow system
CREATE TABLE public.thread_followers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id uuid NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(thread_id, user_id)
);

-- Enable RLS
ALTER TABLE public.thread_followers ENABLE ROW LEVEL SECURITY;

-- Members can view thread followers for threads they can access
CREATE POLICY "Members can view thread followers"
ON public.thread_followers FOR SELECT
USING (EXISTS (
  SELECT 1 FROM threads t
  JOIN channels c ON c.id = t.channel_id
  WHERE t.id = thread_followers.thread_id
  AND is_server_member(auth.uid(), c.server_id)
));

-- Users can manage their own follows
CREATE POLICY "Users can manage own follows"
ON public.thread_followers FOR ALL
USING (auth.uid() = user_id);

-- Enable realtime for thread_followers
ALTER PUBLICATION supabase_realtime ADD TABLE public.thread_followers;