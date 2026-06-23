CREATE OR REPLACE FUNCTION public.mark_stale_users_offline()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Safety net : aucun heartbeat depuis 90 s → l'onglet est fermé / crash / réseau coupé → offline.
  UPDATE public.profiles
     SET status = 'offline'
   WHERE status <> 'offline'
     AND last_seen_at < now() - interval '90 seconds';

  -- Online → idle après 5 min sans activité réelle (mais heartbeat encore vivant).
  UPDATE public.profiles
     SET status = 'idle'
   WHERE status = 'online'
     AND last_activity_at < now() - interval '5 minutes'
     AND last_seen_at >= now() - interval '90 seconds';

  -- IMPORTANT : pas de bascule automatique idle → offline.
  -- Tant que le client envoie un heartbeat (onglet ouvert même caché), l'utilisateur reste "idle".
  -- Seul le watchdog last_seen_at (90 s) au-dessus le passera offline.
END;
$$;