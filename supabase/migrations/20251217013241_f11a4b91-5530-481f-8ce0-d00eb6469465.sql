-- Enable full row data in realtime payloads
ALTER TABLE public.profiles REPLICA IDENTITY FULL;

-- Ensure profiles table is included in realtime publication
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;