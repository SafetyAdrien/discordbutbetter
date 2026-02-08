-- =====================================================
-- WEBHOOK TOKEN SECURITY: Strict RLS Implementation
-- =====================================================
-- Problem: Direct SELECT access to webhooks table could expose tokens
-- Solution: Remove permissive SELECT policy, force all reads through RPC function
-- The get_channel_webhooks RPC function already masks tokens appropriately

-- Step 1: Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Users can view webhooks they manage" ON public.webhooks;

-- Step 2: Drop the ALL policy (we'll create separate policies for each operation)
DROP POLICY IF EXISTS "Admins can manage webhooks" ON public.webhooks;

-- Step 3: Create restrictive operation-specific policies

-- SELECT: Only users with manage_channels permission can directly query webhooks
-- Other users MUST use the get_channel_webhooks RPC function which masks tokens
CREATE POLICY "Only channel managers can view webhooks directly"
ON public.webhooks FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.channels c
    WHERE c.id = webhooks.channel_id
    AND public.has_server_permission(auth.uid(), c.server_id, 'manage_channels'::server_permission)
  )
);

-- INSERT: Users with manage_channels permission can create webhooks
CREATE POLICY "Channel managers can create webhooks"
ON public.webhooks FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by
  AND EXISTS (
    SELECT 1 FROM public.channels c
    WHERE c.id = webhooks.channel_id
    AND public.has_server_permission(auth.uid(), c.server_id, 'manage_channels'::server_permission)
  )
);

-- UPDATE: Only channel managers can update webhooks
CREATE POLICY "Channel managers can update webhooks"
ON public.webhooks FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.channels c
    WHERE c.id = webhooks.channel_id
    AND public.has_server_permission(auth.uid(), c.server_id, 'manage_channels'::server_permission)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.channels c
    WHERE c.id = webhooks.channel_id
    AND public.has_server_permission(auth.uid(), c.server_id, 'manage_channels'::server_permission)
  )
);

-- DELETE: Only channel managers can delete webhooks
CREATE POLICY "Channel managers can delete webhooks"
ON public.webhooks FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.channels c
    WHERE c.id = webhooks.channel_id
    AND public.has_server_permission(auth.uid(), c.server_id, 'manage_channels'::server_permission)
  )
);

-- Step 4: Update the get_channel_webhooks RPC to be more secure
-- The function already masks tokens properly, but let's ensure it validates server membership
CREATE OR REPLACE FUNCTION public.get_channel_webhooks(_channel_id uuid)
RETURNS TABLE(
  id uuid, 
  channel_id uuid, 
  name text, 
  avatar_url text, 
  token text, 
  created_by uuid, 
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    w.id,
    w.channel_id,
    w.name,
    w.avatar_url,
    -- Token is only visible to webhook creator OR users with manage_channels permission
    CASE 
      WHEN w.created_by = auth.uid() 
        OR public.has_server_permission(auth.uid(), c.server_id, 'manage_channels')
      THEN w.token
      ELSE '********'::text  -- Mask token for unauthorized users
    END as token,
    w.created_by,
    w.created_at
  FROM public.webhooks w
  JOIN public.channels c ON c.id = w.channel_id
  WHERE w.channel_id = _channel_id
    AND public.is_server_member(auth.uid(), c.server_id)
  ORDER BY w.created_at DESC;
$$;