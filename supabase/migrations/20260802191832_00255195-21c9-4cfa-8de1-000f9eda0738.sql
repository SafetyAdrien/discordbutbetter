DO $$ BEGIN
  CREATE TYPE public.visibility_level AS ENUM ('private','friends','everyone');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.user_birthdays
  ADD COLUMN IF NOT EXISTS birthday_visibility public.visibility_level NOT NULL DEFAULT 'private';

UPDATE public.user_birthdays
  SET birthday_visibility = 'everyone'
  WHERE birthday_public = true AND birthday_visibility = 'private';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS badge_visibility public.visibility_level NOT NULL DEFAULT 'everyone';

-- Can _viewer see _owner's content given the owner's visibility level?
CREATE OR REPLACE FUNCTION public.can_view_by_visibility(_owner_id uuid, _viewer_id uuid, _level public.visibility_level)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN _viewer_id IS NULL THEN false
    WHEN _owner_id = _viewer_id THEN true
    WHEN _level = 'private' THEN false
    WHEN _level = 'friends' THEN public.is_friend_with(_viewer_id, _owner_id)
    ELSE public.is_friend_with(_viewer_id, _owner_id)
         OR public.shares_server_with(_viewer_id, _owner_id)
         OR public.shares_dm_with(_viewer_id, _owner_id)
  END;
$$;

CREATE OR REPLACE FUNCTION public.is_birthday_today(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_birthdays b
    WHERE b.user_id = uid
      AND b.birthday IS NOT NULL
      AND public.can_view_by_visibility(b.user_id, auth.uid(), b.birthday_visibility)
      AND EXTRACT(MONTH FROM b.birthday) = EXTRACT(MONTH FROM (now() AT TIME ZONE 'UTC'))
      AND EXTRACT(DAY   FROM b.birthday) = EXTRACT(DAY   FROM (now() AT TIME ZONE 'UTC'))
  );
$$;

CREATE OR REPLACE FUNCTION public.are_birthdays_today(uids uuid[])
RETURNS TABLE(user_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT b.user_id
  FROM public.user_birthdays b
  WHERE b.user_id = ANY(uids)
    AND b.birthday IS NOT NULL
    AND public.can_view_by_visibility(b.user_id, auth.uid(), b.birthday_visibility)
    AND EXTRACT(MONTH FROM b.birthday) = EXTRACT(MONTH FROM (now() AT TIME ZONE 'UTC'))
    AND EXTRACT(DAY   FROM b.birthday) = EXTRACT(DAY   FROM (now() AT TIME ZONE 'UTC'));
$$;

DROP FUNCTION IF EXISTS public.get_my_birthday();
CREATE OR REPLACE FUNCTION public.get_my_birthday()
RETURNS TABLE(birthday date, birthday_public boolean, birthday_visibility public.visibility_level)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT b.birthday, b.birthday_public, b.birthday_visibility
  FROM public.user_birthdays b
  WHERE b.user_id = auth.uid();
$$;

DROP POLICY IF EXISTS "User badges visible to self or related users" ON public.user_badges;
CREATE POLICY "User badges visible per owner visibility"
ON public.user_badges FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.can_view_by_visibility(
       user_id, auth.uid(),
       COALESCE((SELECT p.badge_visibility FROM public.profiles p WHERE p.id = user_badges.user_id), 'everyone')
     )
);

DROP POLICY IF EXISTS "Badge grants visible to self or related users" ON public.user_badge_grants;
CREATE POLICY "Badge grants visible per owner visibility"
ON public.user_badge_grants FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.can_view_by_visibility(
       user_id, auth.uid(),
       COALESCE((SELECT p.badge_visibility FROM public.profiles p WHERE p.id = user_badge_grants.user_id), 'everyone')
     )
);