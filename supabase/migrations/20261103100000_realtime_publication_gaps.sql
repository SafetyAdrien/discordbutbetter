-- Temps reel : 1) `forum_tags`, ecoutee par le client via `postgres_changes` mais absente de la publication
-- `supabase_realtime` (aucun evenement ne partait : les tags d'un forum ne changeaient chez les autres qu'au rechargement) ;
-- 2) REPLICA IDENTITY FULL sur les tables dont le client lit autre chose que la cle primaire dans les evenements.
--
-- Idempotent : ignore une table absente ou deja publiee. REPLICA IDENTITY FULL fait porter toutes les colonnes aux
-- evenements UPDATE / DELETE (ex. `message_id` d'une reaction supprimee). Aucune donnee n'est modifiee.

DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY[
    'forum_tags'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
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

    EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', tbl);
  END LOOP;
END $$;

-- Tables deja publiees (ou ajoutee ci-dessus) dont le client lit des colonnes autres que la cle primaire dans les evenements DELETE / UPDATE
-- (ex. `message_id` d'une reaction retiree, `channel_id` d'une epingle retiree, `conversation_id` d'un message de MP supprime).
-- Sans REPLICA IDENTITY FULL, ces evenements n'ont que `id` et l'interface ne sait pas quoi mettre a jour.
DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY[
    'servers',
    'server_settings',
    'threads',
    'reactions',
    'dm_messages',
    'dm_message_reactions',
    'thread_message_reactions',
    'media_post_reactions',
    'pinned_messages',
    'dm_pinned_messages',
    'polls',
    'poll_options',
    'poll_votes',
    'thread_messages',
    'dm_participants',
    'dm_conversations',
    'announcement_reactions',
    'announcement_comment_reactions',
    'friendships',
    'friend_favorites',
    'server_emojis',
    'server_stickers',
    'server_sounds',
    'server_tags',
    'server_profiles',
    'user_server_tags',
    'user_channel_settings',
    'download_permissions',
    'dm_calls',
    'invites'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    IF to_regclass('public.' || tbl) IS NULL THEN
      RAISE WARNING 'skipping %: table does not exist', tbl;
      CONTINUE;
    END IF;
    EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', tbl);
  END LOOP;
END $$;
