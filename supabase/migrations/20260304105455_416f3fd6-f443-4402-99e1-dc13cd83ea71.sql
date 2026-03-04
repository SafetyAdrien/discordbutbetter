
-- Fix the server_bans_safe view to use security_invoker instead of security_definer
DROP VIEW IF EXISTS public.server_bans_safe;

CREATE VIEW public.server_bans_safe 
WITH (security_invoker = on)
AS
SELECT 
  id,
  server_id,
  user_id,
  banned_by,
  created_at,
  CASE 
    WHEN has_server_permission(auth.uid(), server_id, 'ban_members'::server_permission)
      OR is_server_owner(auth.uid(), server_id)
    THEN reason
    ELSE NULL
  END as reason
FROM public.server_bans;
