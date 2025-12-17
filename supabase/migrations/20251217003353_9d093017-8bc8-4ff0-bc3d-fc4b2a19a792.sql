-- Enable REPLICA IDENTITY FULL for realtime tables
ALTER TABLE public.voice_states REPLICA IDENTITY FULL;
ALTER TABLE public.stage_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.stage_participants REPLICA IDENTITY FULL;