-- Update is_server_owner to include secondary_owner_id for same permissions
CREATE OR REPLACE FUNCTION public.is_server_owner(_user_id uuid, _server_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM servers
    WHERE id = _server_id 
    AND (owner_id = _user_id OR secondary_owner_id = _user_id)
  )
$$;

-- Create audit_logs table for moderation history
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id uuid NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_server_id ON public.audit_logs(server_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON public.audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS policy: Only owners and users with view_audit_log permission can view
CREATE POLICY "Owners and admins can view audit logs" ON public.audit_logs
  FOR SELECT
  USING (is_server_owner(auth.uid(), server_id) OR has_server_permission(auth.uid(), server_id, 'administrator'::server_permission));

-- RLS policy: Only system (via security definer functions) can insert
CREATE POLICY "System can insert audit logs" ON public.audit_logs
  FOR INSERT
  WITH CHECK (is_server_owner(auth.uid(), server_id) OR has_server_permission(auth.uid(), server_id, 'administrator'::server_permission));