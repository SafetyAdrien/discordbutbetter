-- Fix role assignment RLS for secondary owner/admins on member_roles
-- The UI allows owners/secondary owners to manage roles; ensure DB policies match.

DROP POLICY IF EXISTS "Admins can manage member roles" ON public.member_roles;

CREATE POLICY "Admins can manage member roles"
ON public.member_roles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.server_members sm
    WHERE sm.id = member_roles.member_id
      AND (
        -- Owner or Secondary Owner
        EXISTS (
          SELECT 1
          FROM public.servers s
          WHERE s.id = sm.server_id
            AND (s.owner_id = auth.uid() OR s.secondary_owner_id = auth.uid())
        )
        OR has_server_permission(auth.uid(), sm.server_id, 'manage_roles'::server_permission)
        OR has_server_permission(auth.uid(), sm.server_id, 'administrator'::server_permission)
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.server_members sm
    WHERE sm.id = member_roles.member_id
      AND (
        EXISTS (
          SELECT 1
          FROM public.servers s
          WHERE s.id = sm.server_id
            AND (s.owner_id = auth.uid() OR s.secondary_owner_id = auth.uid())
        )
        OR has_server_permission(auth.uid(), sm.server_id, 'manage_roles'::server_permission)
        OR has_server_permission(auth.uid(), sm.server_id, 'administrator'::server_permission)
      )
  )
);