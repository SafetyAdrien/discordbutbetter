-- Dedicated, owner-only table for birthday data
CREATE TABLE IF NOT EXISTS public.user_birthdays (
  user_id uuid PRIMARY KEY,
  birthday date,
  birthday_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_birthdays TO authenticated;
GRANT ALL ON public.user_birthdays TO service_role;

ALTER TABLE public.user_birthdays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own birthday"
ON public.user_birthdays
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE TRIGGER update_user_birthdays_updated_at
BEFORE UPDATE ON public.user_birthdays
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate existing data
INSERT INTO public.user_birthdays (user_id, birthday, birthday_public)
SELECT id, birthday, COALESCE(birthday_public, false)
FROM public.profiles
WHERE birthday IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- Repoint functions
CREATE OR REPLACE FUNCTION public.get_my_birthday()
RETURNS TABLE(birthday date, birthday_public boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT b.birthday, b.birthday_public
  FROM public.user_birthdays b
  WHERE b.user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_birthday_today(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_birthdays
    WHERE user_id = uid
      AND birthday_public = true
      AND birthday IS NOT NULL
      AND EXTRACT(MONTH FROM birthday) = EXTRACT(MONTH FROM (now() AT TIME ZONE 'UTC'))
      AND EXTRACT(DAY   FROM birthday) = EXTRACT(DAY   FROM (now() AT TIME ZONE 'UTC'))
  );
$$;

CREATE OR REPLACE FUNCTION public.are_birthdays_today(uids uuid[])
RETURNS TABLE(user_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT b.user_id
  FROM public.user_birthdays b
  WHERE b.user_id = ANY(uids)
    AND b.birthday_public = true
    AND b.birthday IS NOT NULL
    AND EXTRACT(MONTH FROM b.birthday) = EXTRACT(MONTH FROM (now() AT TIME ZONE 'UTC'))
    AND EXTRACT(DAY   FROM b.birthday) = EXTRACT(DAY   FROM (now() AT TIME ZONE 'UTC'));
$$;

CREATE OR REPLACE FUNCTION public.claim_my_birthday_badge()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
    SELECT 1 FROM public.user_birthdays
    WHERE user_id = v_uid
      AND birthday IS NOT NULL
      AND EXTRACT(MONTH FROM birthday) = EXTRACT(MONTH FROM (now() AT TIME ZONE 'UTC'))
      AND EXTRACT(DAY   FROM birthday) = EXTRACT(DAY   FROM (now() AT TIME ZONE 'UTC'))
  ) THEN
    RETURN NULL;
  END IF;

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

-- Remove the exposed columns from profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS birthday;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS birthday_public;