-- Stage sessions table
CREATE TABLE public.stage_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pre_live' CHECK (status IN ('pre_live', 'live', 'ended')),
  title TEXT,
  description TEXT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  started_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Stage participants table
CREATE TABLE public.stage_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES stage_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'audience' CHECK (role IN ('speaker', 'audience', 'moderator')),
  is_muted BOOLEAN DEFAULT true,
  is_video_on BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, user_id)
);

-- Stage hand requests table
CREATE TABLE public.stage_hand_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES stage_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  UNIQUE(session_id, user_id)
);

-- Enable RLS
ALTER TABLE public.stage_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stage_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stage_hand_requests ENABLE ROW LEVEL SECURITY;

-- Stage sessions policies
CREATE POLICY "Members can view stage sessions" ON public.stage_sessions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM channels c
    WHERE c.id = stage_sessions.channel_id
    AND is_server_member(auth.uid(), c.server_id)
  )
);

CREATE POLICY "Admins can manage stage sessions" ON public.stage_sessions
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM channels c
    WHERE c.id = stage_sessions.channel_id
    AND has_server_permission(auth.uid(), c.server_id, 'manage_channels')
  )
);

-- Stage participants policies
CREATE POLICY "Members can view stage participants" ON public.stage_participants
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM stage_sessions ss
    JOIN channels c ON c.id = ss.channel_id
    WHERE ss.id = stage_participants.session_id
    AND is_server_member(auth.uid(), c.server_id)
  )
);

CREATE POLICY "Users can manage their own participation" ON public.stage_participants
FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Moderators can manage participants" ON public.stage_participants
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM stage_sessions ss
    JOIN channels c ON c.id = ss.channel_id
    WHERE ss.id = stage_participants.session_id
    AND has_server_permission(auth.uid(), c.server_id, 'manage_messages')
  )
);

-- Stage hand requests policies
CREATE POLICY "Members can view hand requests" ON public.stage_hand_requests
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM stage_sessions ss
    JOIN channels c ON c.id = ss.channel_id
    WHERE ss.id = stage_hand_requests.session_id
    AND is_server_member(auth.uid(), c.server_id)
  )
);

CREATE POLICY "Users can manage their own hand requests" ON public.stage_hand_requests
FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Moderators can manage hand requests" ON public.stage_hand_requests
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM stage_sessions ss
    JOIN channels c ON c.id = ss.channel_id
    WHERE ss.id = stage_hand_requests.session_id
    AND has_server_permission(auth.uid(), c.server_id, 'manage_messages')
  )
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.stage_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stage_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stage_hand_requests;