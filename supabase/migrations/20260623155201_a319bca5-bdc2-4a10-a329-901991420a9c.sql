
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_activity_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_profiles_last_activity_at ON public.profiles(last_activity_at);

CREATE OR REPLACE FUNCTION public.heartbeat_presence(_active boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  UPDATE public.profiles
     SET last_seen_at = now(),
         last_activity_at = CASE WHEN _active THEN now() ELSE last_activity_at END
   WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.heartbeat_presence(boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_stale_users_offline()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- App injoignable depuis >90 s → offline (sauf déjà offline / dnd manuel non distinguable mais on respecte dnd)
  UPDATE public.profiles
     SET status = 'offline'
   WHERE status NOT IN ('offline', 'dnd')
     AND last_seen_at < now() - interval '90 seconds';

  -- Online sans activité depuis 5 min → idle
  UPDATE public.profiles
     SET status = 'idle'
   WHERE status = 'online'
     AND last_activity_at < now() - interval '5 minutes';

  -- Idle sans activité depuis 7 min → offline
  UPDATE public.profiles
     SET status = 'offline'
   WHERE status = 'idle'
     AND last_activity_at < now() - interval '7 minutes';
END;
$$;
