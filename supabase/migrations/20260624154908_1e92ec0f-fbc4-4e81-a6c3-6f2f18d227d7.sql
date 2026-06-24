CREATE OR REPLACE FUNCTION public.mark_stale_users_offline()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Watchdog : aucun heartbeat depuis 90s → onglet fermé/crash → offline
  UPDATE public.profiles
     SET status = 'offline'
   WHERE status <> 'offline'
     AND last_seen_at < now() - interval '90 seconds';

  -- online → idle (5 min sans activité réelle)
  UPDATE public.profiles
     SET status = 'idle'
   WHERE status = 'online'
     AND last_activity_at < now() - interval '5 minutes'
     AND last_seen_at >= now() - interval '90 seconds';

  -- idle → offline (+5 min, soit 10 min cumulés sans activité)
  UPDATE public.profiles
     SET status = 'offline'
   WHERE status = 'idle'
     AND last_activity_at < now() - interval '10 minutes';

  -- dnd → offline (5 min sans activité)
  UPDATE public.profiles
     SET status = 'offline'
   WHERE status = 'dnd'
     AND last_activity_at < now() - interval '5 minutes';
END;
$$;