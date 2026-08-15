-- 1) Hide birthday columns from the Data API for other users (column-level privileges)
REVOKE SELECT (birthday, birthday_public) ON public.profiles FROM authenticated;
REVOKE SELECT (birthday, birthday_public) ON public.profiles FROM anon;

-- Owner-only accessor for their own birthday settings
CREATE OR REPLACE FUNCTION public.get_my_birthday()
RETURNS TABLE(birthday date, birthday_public boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.birthday, p.birthday_public
  FROM public.profiles p
  WHERE p.id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_my_birthday() TO authenticated;

-- 2) Restrict badge grant history reads
DROP POLICY IF EXISTS "Anyone authenticated can read grants" ON public.user_badge_grants;

CREATE POLICY "Badge grants visible to self or related users"
ON public.user_badge_grants
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_friend_with(auth.uid(), user_id)
  OR public.shares_server_with(auth.uid(), user_id)
  OR public.shares_dm_with(auth.uid(), user_id)
);