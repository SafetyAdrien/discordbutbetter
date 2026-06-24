CREATE OR REPLACE FUNCTION public.mark_stale_users_offline()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Watchdog : plus de heartbeat depuis 2 min → onglet/navigateur fermé → offline
  -- (seule voie vers offline : la page doit être réellement fermée)
  UPDATE public.profiles
     SET status = 'offline'
   WHERE status <> 'offline'
     AND last_seen_at < now() - interval '2 minutes';

  -- online → idle (5 min sans activité, page toujours ouverte)
  UPDATE public.profiles
     SET status = 'idle'
   WHERE status = 'online'
     AND last_activity_at < now() - interval '5 minutes'
     AND last_seen_at >= now() - interval '2 minutes';

  -- dnd → idle (5 min sans activité, page toujours ouverte) — l'inactivité prime sur le manuel
  UPDATE public.profiles
     SET status = 'idle'
   WHERE status = 'dnd'
     AND last_activity_at < now() - interval '5 minutes'
     AND last_seen_at >= now() - interval '2 minutes';

  -- Plus aucune bascule idle → offline ni dnd → offline basée sur l'inactivité :
  -- offline est réservé à la fermeture effective de la page (détectée via last_seen_at ci-dessus).
END;
$function$;