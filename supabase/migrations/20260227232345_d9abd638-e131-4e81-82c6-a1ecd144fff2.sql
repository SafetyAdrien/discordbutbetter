DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'member_roles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.member_roles;
  END IF;
END $$;