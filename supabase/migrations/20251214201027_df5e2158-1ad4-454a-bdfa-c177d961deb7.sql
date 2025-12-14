
-- Create polls table
CREATE TABLE public.polls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  question TEXT NOT NULL CHECK (char_length(question) <= 300),
  allow_multiple BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create poll options table
CREATE TABLE public.poll_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  text TEXT NOT NULL CHECK (char_length(text) <= 100),
  emoji TEXT,
  position INTEGER NOT NULL DEFAULT 0
);

-- Create poll votes table
CREATE TABLE public.poll_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES public.poll_options(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(poll_id, option_id, user_id)
);

-- Enable RLS
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

-- Polls policies
CREATE POLICY "Members can view polls"
ON public.polls FOR SELECT
USING (EXISTS (
  SELECT 1 FROM channels c
  WHERE c.id = polls.channel_id
  AND is_server_member(auth.uid(), c.server_id)
));

CREATE POLICY "Members can create polls"
ON public.polls FOR INSERT
WITH CHECK (
  auth.uid() = author_id
  AND EXISTS (
    SELECT 1 FROM channels c
    WHERE c.id = polls.channel_id
    AND is_server_member(auth.uid(), c.server_id)
  )
);

CREATE POLICY "Authors can delete their polls"
ON public.polls FOR DELETE
USING (auth.uid() = author_id);

-- Poll options policies
CREATE POLICY "Members can view poll options"
ON public.poll_options FOR SELECT
USING (EXISTS (
  SELECT 1 FROM polls p
  JOIN channels c ON c.id = p.channel_id
  WHERE p.id = poll_options.poll_id
  AND is_server_member(auth.uid(), c.server_id)
));

CREATE POLICY "Poll authors can manage options"
ON public.poll_options FOR ALL
USING (EXISTS (
  SELECT 1 FROM polls p
  WHERE p.id = poll_options.poll_id
  AND p.author_id = auth.uid()
));

-- Poll votes policies
CREATE POLICY "Members can view votes"
ON public.poll_votes FOR SELECT
USING (EXISTS (
  SELECT 1 FROM polls p
  JOIN channels c ON c.id = p.channel_id
  WHERE p.id = poll_votes.poll_id
  AND is_server_member(auth.uid(), c.server_id)
));

CREATE POLICY "Members can vote"
ON public.poll_votes FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM polls p
    JOIN channels c ON c.id = p.channel_id
    WHERE p.id = poll_votes.poll_id
    AND is_server_member(auth.uid(), c.server_id)
  )
);

CREATE POLICY "Users can remove their votes"
ON public.poll_votes FOR DELETE
USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.polls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_votes;
