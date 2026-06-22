
-- 1. calendar_events: restrict public events to friends/shared server/shared DM
DROP POLICY IF EXISTS "Anyone can view public events" ON public.calendar_events;
DROP POLICY IF EXISTS "Authenticated can view public events" ON public.calendar_events;
DROP POLICY IF EXISTS "Public events viewable by authenticated" ON public.calendar_events;
DROP POLICY IF EXISTS "Public events are viewable" ON public.calendar_events;

CREATE POLICY "Public events visible to related users"
ON public.calendar_events
FOR SELECT
TO authenticated
USING (
  is_public = true
  AND user_id <> auth.uid()
  AND (
    public.is_friend_with(auth.uid(), user_id)
    OR public.shares_server_with(auth.uid(), user_id)
    OR public.shares_dm_with(auth.uid(), user_id)
  )
);

-- 2. server_settings: add SELECT policy for server members
DROP POLICY IF EXISTS "Server members can view settings" ON public.server_settings;
CREATE POLICY "Server members can view settings"
ON public.server_settings
FOR SELECT
TO authenticated
USING (public.is_server_member(auth.uid(), server_id));

-- 3. voice_signals: tighten INSERT to require channel access
DROP POLICY IF EXISTS "Users can insert their own signals" ON public.voice_signals;
DROP POLICY IF EXISTS "Users can send voice signals" ON public.voice_signals;
DROP POLICY IF EXISTS "Authenticated users can insert signals" ON public.voice_signals;
DROP POLICY IF EXISTS "voice_signals_insert" ON public.voice_signals;

CREATE POLICY "Members can send voice signals in their channels"
ON public.voice_signals
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = from_user_id
  AND public.has_channel_permission(auth.uid(), channel_id, 'connect_voice'::server_permission)
);
