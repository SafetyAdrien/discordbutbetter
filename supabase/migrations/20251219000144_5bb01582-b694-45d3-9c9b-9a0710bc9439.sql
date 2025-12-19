-- Create channel_followers table for the Follow system
CREATE TABLE public.channel_followers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  target_channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  follower_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_channel_follow UNIQUE (source_channel_id, target_channel_id)
);

-- Add columns to messages for published messages from followed channels
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS source_server_id UUID REFERENCES public.servers(id) ON DELETE SET NULL;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS source_server_name TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS source_server_icon TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS source_channel_name TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_published_message BOOLEAN DEFAULT false;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS original_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL;

-- Add column to track if user dismissed the publish prompt
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS publish_dismissed BOOLEAN DEFAULT false;

-- Enable RLS
ALTER TABLE public.channel_followers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for channel_followers
-- Users can view followers for channels they're members of
CREATE POLICY "Members can view channel followers"
ON public.channel_followers
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM channels c
    WHERE (c.id = channel_followers.source_channel_id OR c.id = channel_followers.target_channel_id)
    AND is_server_member(auth.uid(), c.server_id)
  )
);

-- Admins can create followers (follow a channel to their server)
CREATE POLICY "Admins can create channel followers"
ON public.channel_followers
FOR INSERT
WITH CHECK (
  auth.uid() = follower_user_id
  AND EXISTS (
    SELECT 1 FROM channels c
    WHERE c.id = channel_followers.target_channel_id
    AND has_server_permission(auth.uid(), c.server_id, 'administrator'::server_permission)
  )
);

-- Admins can delete followers from their server
CREATE POLICY "Admins can delete channel followers"
ON public.channel_followers
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM channels c
    WHERE c.id = channel_followers.target_channel_id
    AND has_server_permission(auth.uid(), c.server_id, 'administrator'::server_permission)
  )
);

-- Enable realtime for channel_followers
ALTER PUBLICATION supabase_realtime ADD TABLE public.channel_followers;