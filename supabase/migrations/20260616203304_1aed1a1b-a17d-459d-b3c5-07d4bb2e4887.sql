-- Restore EXECUTE on helper functions used inside RLS policies.
-- These are SECURITY DEFINER predicates referenced by USING/WITH CHECK clauses on many tables;
-- revoking PUBLIC/anon EXECUTE breaks every policy that calls them (server import, channels, DMs, etc.).
DO $$
DECLARE
  fn text;
  fns text[] := ARRAY[
    'public.is_server_member(uuid, uuid)',
    'public.is_server_owner(uuid, uuid)',
    'public.is_server_owner_or_secondary(uuid, uuid)',
    'public.has_server_permission(uuid, uuid, server_permission)',
    'public.has_channel_permission(uuid, uuid, server_permission)',
    'public.is_dm_participant(uuid, uuid)',
    'public.shares_dm_with(uuid, uuid)',
    'public.shares_server_with(uuid, uuid)',
    'public.is_friend_with(uuid, uuid)',
    'public.has_dm_interaction(uuid, uuid)',
    'public.can_mention_everyone(uuid, uuid)',
    'public.can_view_webhook_token(uuid, uuid)'
  ];
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO PUBLIC', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
  END LOOP;
END$$;