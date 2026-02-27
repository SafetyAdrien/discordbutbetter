DO $$
BEGIN
  -- Add tables to realtime publication if not already members
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'dm_pinned_messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_pinned_messages;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'server_emojis') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.server_emojis;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'server_stickers') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.server_stickers;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'webhooks') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.webhooks;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'invites') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.invites;
  END IF;
END $$;