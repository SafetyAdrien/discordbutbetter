-- Drop the security definer view (flagged by linter)
DROP VIEW IF EXISTS public.webhooks_secure;

-- Create a function to get webhooks with conditional token visibility
CREATE OR REPLACE FUNCTION public.get_channel_webhooks(_channel_id uuid)
RETURNS TABLE (
  id uuid,
  channel_id uuid,
  name text,
  avatar_url text,
  token text,
  created_by uuid,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    w.id,
    w.channel_id,
    w.name,
    w.avatar_url,
    CASE 
      WHEN w.created_by = auth.uid() 
        OR public.has_server_permission(auth.uid(), c.server_id, 'manage_channels')
      THEN w.token
      ELSE NULL
    END as token,
    w.created_by,
    w.created_at
  FROM public.webhooks w
  JOIN public.channels c ON c.id = w.channel_id
  WHERE w.channel_id = _channel_id
    AND public.is_server_member(auth.uid(), c.server_id)
  ORDER BY w.created_at DESC;
$$;