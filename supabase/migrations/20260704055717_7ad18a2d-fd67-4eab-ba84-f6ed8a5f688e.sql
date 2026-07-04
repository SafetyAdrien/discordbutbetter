
-- 1. Ensure the permanent 'birthday' badge exists
INSERT INTO public.badges (key, name, description, color, sort_order)
VALUES ('birthday', 'Anniversaire', 'A célébré son anniversaire sur la plateforme', '#f5b301', 9000)
ON CONFLICT (key) DO NOTHING;

-- 2. History table
CREATE TABLE IF NOT EXISTS public.user_badge_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id uuid NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  granted_for integer NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_id, granted_for)
);

CREATE INDEX IF NOT EXISTS idx_user_badge_grants_user ON public.user_badge_grants(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badge_grants_badge ON public.user_badge_grants(badge_id);

GRANT SELECT ON public.user_badge_grants TO authenticated;
GRANT ALL ON public.user_badge_grants TO service_role;

ALTER TABLE public.user_badge_grants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can read grants" ON public.user_badge_grants;
CREATE POLICY "Anyone authenticated can read grants"
ON public.user_badge_grants
FOR SELECT
TO authenticated
USING (true);
-- No INSERT/UPDATE/DELETE policies: writes only happen via SECURITY DEFINER RPCs.

-- 3. Migrate old birthday_YYYY badges into the single 'birthday' badge + history
DO $$
DECLARE
  v_birthday_id uuid;
  r RECORD;
  v_year integer;
BEGIN
  SELECT id INTO v_birthday_id FROM public.badges WHERE key = 'birthday';

  FOR r IN
    SELECT ub.user_id, ub.granted_at, b.key AS old_key, b.id AS old_badge_id
    FROM public.user_badges ub
    JOIN public.badges b ON b.id = ub.badge_id
    WHERE b.key LIKE 'birthday_%'
  LOOP
    -- Extract year (birthday_2026 -> 2026)
    BEGIN
      v_year := substring(r.old_key FROM 'birthday_([0-9]+)$')::int;
    EXCEPTION WHEN OTHERS THEN
      v_year := EXTRACT(YEAR FROM r.granted_at)::int;
    END;

    INSERT INTO public.user_badge_grants (user_id, badge_id, granted_for, granted_at)
    VALUES (r.user_id, v_birthday_id, v_year, r.granted_at)
    ON CONFLICT (user_id, badge_id, granted_for) DO NOTHING;

    INSERT INTO public.user_badges (user_id, badge_id, granted_by, granted_at)
    VALUES (r.user_id, v_birthday_id, NULL, r.granted_at)
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END LOOP;

  -- Remove old per-year user_badges rows and badge templates
  DELETE FROM public.user_badges ub
  USING public.badges b
  WHERE ub.badge_id = b.id AND b.key LIKE 'birthday_%';

  DELETE FROM public.badges WHERE key LIKE 'birthday_%';
END $$;

-- 4. Rewrite the claim RPC — single badge + year in history
CREATE OR REPLACE FUNCTION public.claim_my_birthday_badge()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_year int := EXTRACT(YEAR FROM (now() AT TIME ZONE 'UTC'))::int;
  v_badge_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_uid
      AND birthday IS NOT NULL
      AND EXTRACT(MONTH FROM birthday) = EXTRACT(MONTH FROM (now() AT TIME ZONE 'UTC'))
      AND EXTRACT(DAY   FROM birthday) = EXTRACT(DAY   FROM (now() AT TIME ZONE 'UTC'))
  ) THEN
    RETURN NULL;
  END IF;

  -- Ensure the permanent badge exists
  INSERT INTO public.badges (key, name, description, color, sort_order)
  VALUES ('birthday', 'Anniversaire', 'A célébré son anniversaire sur la plateforme', '#f5b301', 9000)
  ON CONFLICT (key) DO NOTHING;

  SELECT id INTO v_badge_id FROM public.badges WHERE key = 'birthday';

  INSERT INTO public.user_badges (user_id, badge_id, granted_by)
  VALUES (v_uid, v_badge_id, v_uid)
  ON CONFLICT (user_id, badge_id) DO NOTHING;

  INSERT INTO public.user_badge_grants (user_id, badge_id, granted_for)
  VALUES (v_uid, v_badge_id, v_year)
  ON CONFLICT (user_id, badge_id, granted_for) DO NOTHING;

  RETURN v_badge_id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_my_birthday_badge() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_my_birthday_badge() TO authenticated;
