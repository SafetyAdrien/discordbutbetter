-- Enable REPLICA IDENTITY FULL for profiles to ensure reliable Realtime updates
ALTER TABLE public.profiles REPLICA IDENTITY FULL;

-- Update the watchdog function with requested delays (5 min idle, 5 min offline)
CREATE OR REPLACE FUNCTION public.mark_stale_users_offline()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- 1. Pas de heartbeat depuis 5 min -> offline
  -- On ne touche pas aux utilisateurs déjà offline.
  UPDATE public.profiles
     SET status = 'offline'
   WHERE status <> 'offline'
     AND last_seen_at < now() - interval '5 minutes';

  -- 2. Page ouverte (heartbeat < 5 min) mais pas d'activité depuis 5 min -> idle
  -- On ne touche qu'à ceux qui sont online ou dnd.
  UPDATE public.profiles
     SET status = 'idle'
   WHERE status IN ('online', 'dnd')
     AND last_activity_at < now() - interval '5 minutes'
     AND last_seen_at >= now() - interval '5 minutes';
END;
$function$;

-- Update heartbeat_presence to trigger the watchdog
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

  -- Mettre à jour l'utilisateur courant
  UPDATE public.profiles
     SET last_seen_at = now(),
         last_activity_at = CASE WHEN _active THEN now() ELSE last_activity_at END,
         status = CASE
           -- Réveil auto si activité détectée
           WHEN _active 
            AND status IN ('idle', 'offline')
            AND COALESCE(manual_status, 'online'::public.user_status) NOT IN ('idle', 'offline')
             THEN COALESCE(manual_status, 'online'::public.user_status)
           ELSE status
         END
   WHERE id = auth.uid();

  -- Watchdog décentralisé : chaque heartbeat nettoie les utilisateurs inactifs
  PERFORM public.mark_stale_users_offline();
END;
$function$;
