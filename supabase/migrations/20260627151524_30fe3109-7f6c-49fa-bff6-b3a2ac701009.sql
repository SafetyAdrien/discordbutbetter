-- Fix: Stage signaling broken after dropping the permissive policy.
-- Stage uses stage_sessions.id as the "channel_id" in voice_signals,
-- so the strict has_channel_permission check fails. Resolve session -> real channel.

DROP POLICY IF EXISTS "Members can send voice signals in their channels" ON public.voice_signals;

CREATE POLICY "Members can send voice signals in their channels"
ON public.voice_signals
FOR INSERT
WITH CHECK (
  auth.uid() = from_user_id
  AND (
    has_channel_permission(auth.uid(), channel_id, 'connect_voice'::server_permission)
    OR EXISTS (
      SELECT 1
      FROM public.stage_sessions s
      WHERE s.id = voice_signals.channel_id
        AND has_channel_permission(auth.uid(), s.channel_id, 'connect_voice'::server_permission)
    )
  )
);