-- Create batch function to get channel permissions for an entire server
-- This replaces N+M individual RPC calls with a single batch query

CREATE OR REPLACE FUNCTION public.get_server_channel_permissions(
  _user_id uuid,
  _server_id uuid
)
RETURNS TABLE(
  channel_id uuid,
  can_view boolean,
  can_connect boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as channel_id,
    has_channel_permission(_user_id, c.id, 'view_channel'::server_permission) as can_view,
    CASE 
      WHEN c.type IN ('voice', 'stage') 
      THEN has_channel_permission(_user_id, c.id, 'connect_voice'::server_permission)
      ELSE true
    END as can_connect
  FROM channels c
  WHERE c.server_id = _server_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_server_channel_permissions(uuid, uuid) TO authenticated;