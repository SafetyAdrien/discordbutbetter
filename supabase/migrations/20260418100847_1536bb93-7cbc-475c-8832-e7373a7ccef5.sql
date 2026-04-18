-- 1. DM message reactions
CREATE TABLE public.dm_message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);
CREATE INDEX idx_dm_message_reactions_message ON public.dm_message_reactions(message_id);
ALTER TABLE public.dm_message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view dm reactions"
ON public.dm_message_reactions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM dm_messages m
  WHERE m.id = dm_message_reactions.message_id
    AND is_dm_participant(auth.uid(), m.conversation_id)
));

CREATE POLICY "Participants can add dm reactions"
ON public.dm_message_reactions FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM dm_messages m
    WHERE m.id = dm_message_reactions.message_id
      AND is_dm_participant(auth.uid(), m.conversation_id)
  )
);

CREATE POLICY "Users can remove their dm reactions"
ON public.dm_message_reactions FOR DELETE
USING (auth.uid() = user_id);

-- 2. Thread message reactions
CREATE TABLE public.thread_message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);
CREATE INDEX idx_thread_message_reactions_message ON public.thread_message_reactions(message_id);
ALTER TABLE public.thread_message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view thread reactions"
ON public.thread_message_reactions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM thread_messages tm
  JOIN threads t ON t.id = tm.thread_id
  JOIN channels c ON c.id = t.channel_id
  WHERE tm.id = thread_message_reactions.message_id
    AND is_server_member(auth.uid(), c.server_id)
));

CREATE POLICY "Members can add thread reactions"
ON public.thread_message_reactions FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM thread_messages tm
    JOIN threads t ON t.id = tm.thread_id
    JOIN channels c ON c.id = t.channel_id
    WHERE tm.id = thread_message_reactions.message_id
      AND is_server_member(auth.uid(), c.server_id)
  )
);

CREATE POLICY "Users can remove their thread reactions"
ON public.thread_message_reactions FOR DELETE
USING (auth.uid() = user_id);

-- 3. Media post reactions
CREATE TABLE public.media_post_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id, emoji)
);
CREATE INDEX idx_media_post_reactions_post ON public.media_post_reactions(post_id);
ALTER TABLE public.media_post_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view media reactions"
ON public.media_post_reactions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM media_posts mp
  JOIN channels c ON c.id = mp.channel_id
  WHERE mp.id = media_post_reactions.post_id
    AND is_server_member(auth.uid(), c.server_id)
));

CREATE POLICY "Members can add media reactions"
ON public.media_post_reactions FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM media_posts mp
    JOIN channels c ON c.id = mp.channel_id
    WHERE mp.id = media_post_reactions.post_id
      AND is_server_member(auth.uid(), c.server_id)
  )
);

CREATE POLICY "Users can remove their media reactions"
ON public.media_post_reactions FOR DELETE
USING (auth.uid() = user_id);

-- 4. Announcement comment reactions
CREATE TABLE public.announcement_comment_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(comment_id, user_id, emoji)
);
CREATE INDEX idx_announcement_comment_reactions_comment ON public.announcement_comment_reactions(comment_id);
ALTER TABLE public.announcement_comment_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view comment reactions"
ON public.announcement_comment_reactions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM announcement_comments ac
  JOIN announcements a ON a.id = ac.announcement_id
  JOIN channels c ON c.id = a.channel_id
  WHERE ac.id = announcement_comment_reactions.comment_id
    AND is_server_member(auth.uid(), c.server_id)
));

CREATE POLICY "Members can add comment reactions"
ON public.announcement_comment_reactions FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM announcement_comments ac
    JOIN announcements a ON a.id = ac.announcement_id
    JOIN channels c ON c.id = a.channel_id
    WHERE ac.id = announcement_comment_reactions.comment_id
      AND is_server_member(auth.uid(), c.server_id)
  )
);

CREATE POLICY "Users can remove their comment reactions"
ON public.announcement_comment_reactions FOR DELETE
USING (auth.uid() = user_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.thread_message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.media_post_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcement_comment_reactions;