
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS manual_status public.user_status;

CREATE OR REPLACE FUNCTION public.mark_stale_users_offline()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- online/dnd inactif depuis 5 min mais page encore ouverte → idle
  UPDATE public.profiles
     SET status = 'idle'
   WHERE status IN ('online', 'dnd')
     AND last_activity_at < now() - interval '5 minutes'
     AND last_seen_at >= now() - interval '5 minutes';

  -- Pas de heartbeat depuis 5 min → page/navigateur fermé → offline
  UPDATE public.profiles
     SET status = 'offline'
   WHERE status <> 'offline'
     AND last_seen_at < now() - interval '5 minutes';
END;
$function$;
