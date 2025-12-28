-- Drop the existing permissive SELECT policy for members
DROP POLICY IF EXISTS "Members can view server invites" ON public.invites;

-- Create a new restrictive SELECT policy that only allows administrators to view invites
CREATE POLICY "Admins can view server invites" 
ON public.invites 
FOR SELECT 
USING (
  is_server_owner(auth.uid(), server_id) 
  OR has_server_permission(auth.uid(), server_id, 'administrator'::server_permission)
  OR has_server_permission(auth.uid(), server_id, 'manage_server'::server_permission)
);