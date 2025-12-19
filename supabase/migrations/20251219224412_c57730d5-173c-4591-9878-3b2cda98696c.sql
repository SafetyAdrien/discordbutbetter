-- Create a secure function to find users for friend requests
-- This bypasses RLS in a controlled way, only exposing minimal data
CREATE OR REPLACE FUNCTION public.find_user_for_friend_request(target_username text)
RETURNS TABLE (
  id uuid,
  username text,
  display_name text,
  avatar_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Don't allow finding yourself
  IF target_username IS NULL OR target_username = '' THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.display_name,
    p.avatar_url
  FROM profiles p
  WHERE LOWER(p.username) = LOWER(target_username)
    AND p.id != auth.uid();
END;
$$;