-- Add realtime publication for tables the client already subscribes to via
-- `postgres_changes`, but which were never added to the publication. Without
-- this, those subscriptions silently never fire (server rename/settings,
-- pins, forum posts, DM conversations, audit logs, ...).
--
-- Guarded with IF NOT EXISTS so the migration is idempotent, matching the
-- existing pattern in 20260228083605_6ef913a4.

DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY[
    'pinned_messages',
    'forum_posts',
    'forum_post_comments',
    'dm_conversations',
    'dm_participants',
    'audit_logs',
    'announcement_categories',
    'announcement_reactions',
    'friend_favorites',
    'user_badge_grants'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    -- Skip tables that don't exist in this database (keeps the migration
    -- safe against drift between environments).
    IF to_regclass('public.' || tbl) IS NULL THEN
      RAISE WARNING 'skipping %: table does not exist', tbl;
      CONTINUE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = tbl AND schemaname = 'public'
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
    END IF;
  END LOOP;
END $$;