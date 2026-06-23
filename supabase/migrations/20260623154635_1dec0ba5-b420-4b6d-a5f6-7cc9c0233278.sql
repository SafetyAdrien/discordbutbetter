
-- Enable pg_cron for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Track last activity timestamp on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_profiles_last_seen_at ON public.profiles(last_seen_at);

-- Heartbeat RPC: bumps last_seen_at for the caller, and wakes them from 'offline' (unless they explicitly chose offline — but we cannot distinguish; only auto-offline matters here since manual offline keeps them on 'offline' anyway)
CREATE OR REPLACE FUNCTION public.heartbeat_presence()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  UPDATE public.profiles
     SET last_seen_at = now()
   WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.heartbeat_presence() TO authenticated;

-- Auto-offline function: marks users whose heartbeat is stale (>90s) as offline
CREATE OR REPLACE FUNCTION public.mark_stale_users_offline()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles
     SET status = 'offline'
   WHERE status <> 'offline'
     AND last_seen_at < now() - interval '90 seconds';
$$;

-- Schedule every minute
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'mark-stale-users-offline') THEN
    PERFORM cron.schedule('mark-stale-users-offline', '* * * * *', $cron$SELECT public.mark_stale_users_offline();$cron$);
  END IF;
END $$;
