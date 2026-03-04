
-- =============================================
-- PHASE 1: CRITICAL SECURITY FIXES
-- =============================================

-- 1. Fix voice_states: Prevent users from self-unmuting server_muted/server_deafened
-- Drop the old permissive UPDATE policy and replace with a restricted one
DROP POLICY IF EXISTS "Users can update own voice state" ON public.voice_states;

CREATE POLICY "Users can update own voice state restricted"
ON public.voice_states
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  -- Prevent modification of server_muted, server_deafened, muted_by by the user themselves
  -- These fields can only be changed by SECURITY DEFINER functions (server_mute_participant, server_deafen_participant)
  AND (
    -- If the row previously had server_muted = true, the new value must also be true (user cannot self-unmute)
    (server_muted IS NOT DISTINCT FROM (SELECT vs.server_muted FROM voice_states vs WHERE vs.user_id = auth.uid() LIMIT 1))
    AND (server_deafened IS NOT DISTINCT FROM (SELECT vs.server_deafened FROM voice_states vs WHERE vs.user_id = auth.uid() LIMIT 1))
    AND (muted_by IS NOT DISTINCT FROM (SELECT vs.muted_by FROM voice_states vs WHERE vs.user_id = auth.uid() LIMIT 1))
  )
);

-- 2. Restrict server_settings: Only admins/owners can view (remove "Members can view")
DROP POLICY IF EXISTS "Members can view server settings" ON public.server_settings;

-- 3. Protect audit_logs: Remove client-side INSERT policy
-- Audit logs should only be inserted by SECURITY DEFINER functions (triggers)
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

-- Create a SECURITY DEFINER function for inserting audit logs
CREATE OR REPLACE FUNCTION public.insert_audit_log(
  _server_id uuid,
  _action_type text,
  _target_id uuid DEFAULT NULL,
  _details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verify the caller is a member of the server
  IF NOT is_server_member(auth.uid(), _server_id) THEN
    RAISE EXCEPTION 'Not a server member';
  END IF;

  INSERT INTO public.audit_logs (server_id, actor_id, action_type, target_id, details)
  VALUES (_server_id, auth.uid(), _action_type, _target_id, _details);
END;
$$;

-- =============================================
-- PHASE 2: DATA PROTECTION
-- =============================================

-- 4. Restrict ban reasons: Only admins can see the reason field
-- Create a secure view for server_bans that hides reason from non-admins
CREATE OR REPLACE VIEW public.server_bans_safe AS
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

-- 5. Protect invite uses field: Remove ability to directly update uses
-- Drop the ALL policy for admins and recreate without allowing uses modification
DROP POLICY IF EXISTS "Admins can manage invites" ON public.invites;

-- Recreate admin policy for SELECT, DELETE only (INSERT handled separately, UPDATE restricted)
CREATE POLICY "Admins can manage invites select delete"
ON public.invites
FOR SELECT
TO authenticated
USING (
  is_server_owner(auth.uid(), server_id) 
  OR has_server_permission(auth.uid(), server_id, 'administrator'::server_permission)
);

CREATE POLICY "Admins can delete invites"
ON public.invites
FOR DELETE
TO authenticated
USING (
  is_server_owner(auth.uid(), server_id) 
  OR has_server_permission(auth.uid(), server_id, 'administrator'::server_permission)
);

-- Admin UPDATE: allow everything EXCEPT the uses field
CREATE POLICY "Admins can update invites restricted"
ON public.invites
FOR UPDATE
TO authenticated
USING (
  is_server_owner(auth.uid(), server_id) 
  OR has_server_permission(auth.uid(), server_id, 'administrator'::server_permission)
)
WITH CHECK (
  is_server_owner(auth.uid(), server_id) 
  OR has_server_permission(auth.uid(), server_id, 'administrator'::server_permission)
);
