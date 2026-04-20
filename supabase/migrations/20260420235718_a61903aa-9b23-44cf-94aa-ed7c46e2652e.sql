-- Table for favorite friends (mobile profile "Friends" page)
CREATE TABLE IF NOT EXISTS public.friend_favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  friend_user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, friend_user_id)
);

ALTER TABLE public.friend_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own favorites"
ON public.friend_favorites FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can add their own favorites"
ON public.friend_favorites FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own favorites"
ON public.friend_favorites FOR DELETE
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_friend_favorites_user ON public.friend_favorites(user_id);