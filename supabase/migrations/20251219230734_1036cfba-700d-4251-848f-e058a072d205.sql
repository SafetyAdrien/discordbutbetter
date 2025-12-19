-- Create a function to get profiles of users with friendship relations
-- This bypasses RLS but securely checks that the caller has a friendship with the requested profiles
CREATE OR REPLACE FUNCTION public.get_friendship_profiles(friendship_user_ids uuid[])
RETURNS TABLE (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  status text,
  custom_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.status::text,
    p.custom_status
  FROM profiles p
  WHERE p.id = ANY(friendship_user_ids)
    AND EXISTS (
      SELECT 1 FROM friendships f
      WHERE (f.user_id = auth.uid() OR f.friend_id = auth.uid())
        AND (f.user_id = p.id OR f.friend_id = p.id)
    );
END;
$$;