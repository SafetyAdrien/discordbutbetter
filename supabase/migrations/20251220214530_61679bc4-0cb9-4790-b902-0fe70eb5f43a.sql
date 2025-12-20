-- =====================================================
-- PARTIE 1: Table de signalisation pour appels DM
-- =====================================================
CREATE TABLE public.dm_call_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id uuid NOT NULL REFERENCES public.dm_calls(id) ON DELETE CASCADE,
  from_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  signal_type text NOT NULL,
  signal_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Index pour performance
CREATE INDEX idx_dm_call_signals_to_user ON public.dm_call_signals(to_user_id);
CREATE INDEX idx_dm_call_signals_call ON public.dm_call_signals(call_id);

-- Enable RLS
ALTER TABLE public.dm_call_signals ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert signals they send
CREATE POLICY "Users can insert signals they send" ON public.dm_call_signals 
  FOR INSERT WITH CHECK (auth.uid() = from_user_id);

-- Policy: Users can view signals sent to them
CREATE POLICY "Users can view signals sent to them" ON public.dm_call_signals 
  FOR SELECT USING (auth.uid() = to_user_id);

-- Policy: Users can delete signals they own
CREATE POLICY "Users can delete their signals" ON public.dm_call_signals 
  FOR DELETE USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- Enable realtime for signaling
ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_call_signals;

-- =====================================================
-- PARTIE 2: Table des mentions pour notifications
-- =====================================================
CREATE TABLE public.channel_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(channel_id, user_id, message_id)
);

-- Index pour performance
CREATE INDEX idx_channel_mentions_user_unread ON public.channel_mentions(user_id);
CREATE INDEX idx_channel_mentions_channel ON public.channel_mentions(channel_id);

-- Enable RLS
ALTER TABLE public.channel_mentions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own mentions
CREATE POLICY "Users can view their mentions" ON public.channel_mentions 
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can delete their own mentions (mark as read)
CREATE POLICY "Users can delete their mentions" ON public.channel_mentions 
  FOR DELETE USING (auth.uid() = user_id);

-- Policy: System can insert mentions (via messages or server members context)
CREATE POLICY "Server members can insert mentions" ON public.channel_mentions 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM channels c
      WHERE c.id = channel_mentions.channel_id
      AND is_server_member(auth.uid(), c.server_id)
    )
  );

-- Enable realtime for mentions
ALTER PUBLICATION supabase_realtime ADD TABLE public.channel_mentions;

-- =====================================================
-- FUNCTION: Détection et insertion des mentions
-- =====================================================
CREATE OR REPLACE FUNCTION public.detect_and_insert_mentions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  mention_pattern text;
  mentioned_user_id uuid;
  channel_server_id uuid;
  member_user_ids uuid[];
BEGIN
  -- Get the server_id for this channel
  SELECT server_id INTO channel_server_id
  FROM channels WHERE id = NEW.channel_id;
  
  IF channel_server_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check for @everyone or @here
  IF NEW.content ~* '@everyone|@here' THEN
    -- Get all server members except the author
    SELECT array_agg(user_id) INTO member_user_ids
    FROM server_members
    WHERE server_id = channel_server_id AND user_id != NEW.author_id;
    
    IF member_user_ids IS NOT NULL THEN
      INSERT INTO channel_mentions (channel_id, user_id, message_id)
      SELECT NEW.channel_id, unnest(member_user_ids), NEW.id
      ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
  END IF;

  -- Check for user mentions like <@uuid> or @username
  -- Pattern for UUID mentions: <@uuid>
  FOR mentioned_user_id IN
    SELECT DISTINCT (regexp_matches(NEW.content, '<@([0-9a-f-]{36})>', 'gi'))[1]::uuid
  LOOP
    IF mentioned_user_id != NEW.author_id THEN
      -- Verify user is member of server
      IF EXISTS (SELECT 1 FROM server_members WHERE server_id = channel_server_id AND user_id = mentioned_user_id) THEN
        INSERT INTO channel_mentions (channel_id, user_id, message_id)
        VALUES (NEW.channel_id, mentioned_user_id, NEW.id)
        ON CONFLICT DO NOTHING;
      END IF;
    END IF;
  END LOOP;

  -- Also check for @username mentions
  FOR mentioned_user_id IN
    SELECT DISTINCT p.id
    FROM profiles p
    JOIN server_members sm ON sm.user_id = p.id AND sm.server_id = channel_server_id
    WHERE NEW.content ~* ('@' || p.username || '(?![a-zA-Z0-9_])')
      AND p.id != NEW.author_id
  LOOP
    INSERT INTO channel_mentions (channel_id, user_id, message_id)
    VALUES (NEW.channel_id, mentioned_user_id, NEW.id)
    ON CONFLICT DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Trigger for mention detection on message insert
CREATE TRIGGER trigger_detect_mentions
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.detect_and_insert_mentions();