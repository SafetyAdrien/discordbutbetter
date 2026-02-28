
DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY['threads', 'thread_messages', 'reactions', 'server_settings', 'servers', 'dm_calls'];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = tbl AND schemaname = 'public'
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
    END IF;
  END LOOP;
END $$;
