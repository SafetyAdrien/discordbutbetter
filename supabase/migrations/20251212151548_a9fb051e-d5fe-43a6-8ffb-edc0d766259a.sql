-- Drop the overly permissive policy that exposes all invites
DROP POLICY IF EXISTS "Anyone can view invites by code" ON public.invites;

-- Create a secure RPC function to lookup invite by code
-- This returns only necessary public information without exposing the full table
CREATE OR REPLACE FUNCTION public.get_invite_details(invite_code text)
RETURNS TABLE (
  id uuid,
  server_id uuid,
  server_name text,
  server_icon_url text,
  server_description text,
  member_count bigint,
  expires_at timestamptz,
  max_uses integer,
  uses integer,
  is_expired boolean,
  is_maxed boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    i.id,
    i.server_id,
    s.name as server_name,
    s.icon_url as server_icon_url,
    s.description as server_description,
    (SELECT COUNT(*) FROM server_members WHERE server_id = i.server_id) as member_count,
    i.expires_at,
    i.max_uses,
    i.uses,
    (i.expires_at IS NOT NULL AND i.expires_at < NOW()) as is_expired,
    (i.max_uses IS NOT NULL AND i.uses >= i.max_uses) as is_maxed
  FROM invites i
  JOIN servers s ON s.id = i.server_id
  WHERE i.code = invite_code
  LIMIT 1;
$$;

-- Create a restricted policy that only allows server members/admins to view their own invites
CREATE POLICY "Members can view server invites"
ON public.invites
FOR SELECT
USING (
  is_server_member(auth.uid(), server_id)
);