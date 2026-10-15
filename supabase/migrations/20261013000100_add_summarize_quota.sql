-- Rate limit for the `summarize-channel` edge function.
--
-- Each call costs money (gpt-4o-mini). The function used to have no quota at
-- all: any member of any channel could drive unbounded spend. The counter is
-- kept in Postgres rather than in edge-function memory so it is shared across
-- instances and survives cold starts.
--
-- The counting is done in a single statement taking a row lock on the user, so
-- concurrent calls cannot race past the limit.

CREATE TABLE IF NOT EXISTS public.ai_usage_counters (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  call_count integer NOT NULL DEFAULT 0
);

ALTER TABLE public.ai_usage_counters ENABLE ROW LEVEL SECURITY;

-- The table is only ever reached through the SECURITY DEFINER function below.
-- No direct client access.
REVOKE ALL ON TABLE public.ai_usage_counters FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.check_summarize_quota(
  _user_id uuid,
  _window_hours integer DEFAULT 24,
  _max_calls integer DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row ai_usage_counters%ROWTYPE;
  _allowed boolean;
  _retry_after_hours integer;
BEGIN
  -- Lock the caller's row for the duration of the check+increment. This is
  -- what makes the check-and-increment atomic across concurrent requests.
  INSERT INTO public.ai_usage_counters (user_id, window_started_at, call_count)
  VALUES (_user_id, now(), 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO _row
  FROM public.ai_usage_counters
  WHERE user_id = _user_id
  FOR UPDATE;

  -- Reset the window when it has elapsed.
  IF _row.window_started_at < now() - make_interval(hours => _window_hours) THEN
    UPDATE public.ai_usage_counters
    SET window_started_at = now(), call_count = 0
    WHERE user_id = _user_id;

    _allowed := true;
  ELSIF _row.call_count < _max_calls THEN
    _allowed := true;
  ELSE
    _allowed := false;
  END IF;

  IF _allowed THEN
    UPDATE public.ai_usage_counters
    SET call_count = call_count + 1
    WHERE user_id = _user_id;
  END IF;

  _retry_after_hours := GREATEST(
    1,
    CEIL(
      EXTRACT(EPOCH FROM (now() + make_interval(hours => _window_hours) - _row.window_started_at)) / 3600
    )::integer
  );

  RETURN jsonb_build_object(
    'allowed', _allowed,
    'remaining', GREATEST(_max_calls - _row.call_count - 1, 0),
    'retry_after_hours', _retry_after_hours
  );
END;
$$;

-- Only the service role (used inside the edge function) may call this.
REVOKE ALL ON FUNCTION public.check_summarize_quota(uuid, integer, integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_summarize_quota(uuid, integer, integer) TO service_role;