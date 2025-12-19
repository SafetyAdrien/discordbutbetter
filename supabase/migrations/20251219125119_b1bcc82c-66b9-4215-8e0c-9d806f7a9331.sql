-- Create table for liked summaries
CREATE TABLE public.user_summary_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  summary_id UUID NOT NULL REFERENCES public.channel_summaries(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, summary_id)
);

-- Enable RLS
ALTER TABLE public.user_summary_likes ENABLE ROW LEVEL SECURITY;

-- Users can view their own likes
CREATE POLICY "Users can view own likes" ON public.user_summary_likes
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own likes
CREATE POLICY "Users can insert own likes" ON public.user_summary_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own likes
CREATE POLICY "Users can delete own likes" ON public.user_summary_likes
  FOR DELETE USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX idx_user_summary_likes_user ON public.user_summary_likes(user_id);
CREATE INDEX idx_user_summary_likes_summary ON public.user_summary_likes(summary_id);