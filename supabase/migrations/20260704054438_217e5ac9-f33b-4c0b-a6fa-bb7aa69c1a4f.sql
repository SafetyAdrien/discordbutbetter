
-- 1. Add birthday columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS birthday DATE,
  ADD COLUMN IF NOT EXISTS birthday_public BOOLEAN NOT NULL DEFAULT false;

-- 2. Is birthday today (respects birthday_public)
CREATE OR REPLACE FUNCTION public.is_birthday_today(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = uid
      AND birthday_public = true
      AND birthday IS NOT NULL
      AND EXTRACT(MONTH FROM birthday) = EXTRACT(MONTH FROM (now() AT TIME ZONE 'UTC'))
      AND EXTRACT(DAY   FROM birthday) = EXTRACT(DAY   FROM (now() AT TIME ZONE 'UTC'))
  );
$$;

REVOKE ALL ON FUNCTION public.is_birthday_today(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_birthday_today(uuid) TO authenticated;

-- 3. Batch version
CREATE OR REPLACE FUNCTION public.are_birthdays_today(uids uuid[])
RETURNS TABLE(user_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id
  FROM public.profiles p
  WHERE p.id = ANY(uids)
    AND p.birthday_public = true
    AND p.birthday IS NOT NULL
    AND EXTRACT(MONTH FROM p.birthday) = EXTRACT(MONTH FROM (now() AT TIME ZONE 'UTC'))
    AND EXTRACT(DAY   FROM p.birthday) = EXTRACT(DAY   FROM (now() AT TIME ZONE 'UTC'));
$$;

REVOKE ALL ON FUNCTION public.are_birthdays_today(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.are_birthdays_today(uuid[]) TO authenticated;

-- 4. Seed a badge template for the current year (idempotent)
INSERT INTO public.badges (key, name, description, icon_url, color, sort_order)
VALUES (
  'birthday_' || EXTRACT(YEAR FROM now())::text,
  'Anniversaire ' || EXTRACT(YEAR FROM now())::text,
  'A célébré son anniversaire en ' || EXTRACT(YEAR FROM now())::text,
  NULL,
  '#f5b301',
  9000 + EXTRACT(YEAR FROM now())::int
)
ON CONFLICT (key) DO NOTHING;

-- 5. Claim badge RPC — self-service, only if it really is your birthday today
CREATE OR REPLACE FUNCTION public.claim_my_birthday_badge()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_year int := EXTRACT(YEAR FROM (now() AT TIME ZONE 'UTC'))::int;
  v_key text;
  v_badge_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Real birthday check (independent of birthday_public — user can always get their own badge)
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_uid
      AND birthday IS NOT NULL
      AND EXTRACT(MONTH FROM birthday) = EXTRACT(MONTH FROM (now() AT TIME ZONE 'UTC'))
      AND EXTRACT(DAY   FROM birthday) = EXTRACT(DAY   FROM (now() AT TIME ZONE 'UTC'))
  ) THEN
    RETURN NULL;
  END IF;

  v_key := 'birthday_' || v_year::text;

  -- Ensure the yearly badge exists (creates it the first time anyone hits Jan 1st of a new year)
  INSERT INTO public.badges (key, name, description, color, sort_order)
  VALUES (
    v_key,
    'Anniversaire ' || v_year::text,
    'A célébré son anniversaire en ' || v_year::text,
    '#f5b301',
    9000 + v_year
  )
  ON CONFLICT (key) DO NOTHING;

  SELECT id INTO v_badge_id FROM public.badges WHERE key = v_key;

  INSERT INTO public.user_badges (user_id, badge_id, granted_by)
  VALUES (v_uid, v_badge_id, v_uid)
  ON CONFLICT (user_id, badge_id) DO NOTHING;

  RETURN v_badge_id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_my_birthday_badge() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_my_birthday_badge() TO authenticated;
