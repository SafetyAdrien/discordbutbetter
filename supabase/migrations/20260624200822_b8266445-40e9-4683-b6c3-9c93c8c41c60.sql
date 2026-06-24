CREATE OR REPLACE FUNCTION public.heartbeat_presence(_active boolean DEFAULT false)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.profiles
     SET last_seen_at = now(),
         last_activity_at = CASE WHEN _active THEN now() ELSE last_activity_at END,
         status = CASE
           WHEN _active
            AND status IN ('idle', 'offline')
            AND COALESCE(manual_status, 'online'::public.user_status) NOT IN ('idle', 'offline')
             THEN COALESCE(manual_status, 'online'::public.user_status)
           ELSE status
         END
   WHERE id = auth.uid();
END;
$function$;

CREATE OR REPLACE FUNCTION public.mark_stale_users_offline()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Plus aucun heartbeat depuis 10 min : après 5 min d'idle visible, l'utilisateur devient offline.
  UPDATE public.profiles
     SET status = 'offline'
   WHERE status <> 'offline'
     AND last_seen_at < now() - interval '10 minutes';

  -- Page encore ouverte mais aucune activité depuis 5 min, OU page fermée depuis 5 min : idle.
  UPDATE public.profiles
     SET status = 'idle'
   WHERE status IN ('online', 'dnd')
     AND (
       last_activity_at < now() - interval '5 minutes'
       OR last_seen_at < now() - interval '5 minutes'
     )
     AND last_seen_at >= now() - interval '10 minutes';
END;
$function$;