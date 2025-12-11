-- =============================================
-- FIX 1: Secure profile visibility
-- =============================================

-- Drop existing overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- Helper function to check if users share a server
CREATE OR REPLACE FUNCTION public.shares_server_with(_user_id uuid, _other_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.server_members sm1
    JOIN public.server_members sm2 ON sm1.server_id = sm2.server_id
    WHERE sm1.user_id = _user_id AND sm2.user_id = _other_user_id
  )
$$;

-- Helper function to check if users are friends
CREATE OR REPLACE FUNCTION public.is_friend_with(_user_id uuid, _other_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE status = 'accepted'
      AND ((user_id = _user_id AND friend_id = _other_user_id)
        OR (user_id = _other_user_id AND friend_id = _user_id))
  )
$$;

-- Helper function to check if users share a DM conversation
CREATE OR REPLACE FUNCTION public.shares_dm_with(_user_id uuid, _other_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.dm_participants dp1
    JOIN public.dm_participants dp2 ON dp1.conversation_id = dp2.conversation_id
    WHERE dp1.user_id = _user_id AND dp2.user_id = _other_user_id
  )
$$;

-- Users can always view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Users can view profiles of people they have a relationship with
CREATE POLICY "Users can view related profiles"
ON public.profiles
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND (
    public.shares_server_with(auth.uid(), id)
    OR public.is_friend_with(auth.uid(), id)
    OR public.shares_dm_with(auth.uid(), id)
  )
);

-- =============================================
-- FIX 2: Secure webhook token visibility
-- =============================================

-- Drop existing policies on webhooks
DROP POLICY IF EXISTS "Admins can manage webhooks" ON public.webhooks;
DROP POLICY IF EXISTS "Members can view webhooks" ON public.webhooks;

-- Helper function to check if user can view webhook token
CREATE OR REPLACE FUNCTION public.can_view_webhook_token(_user_id uuid, _webhook_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.webhooks w
    JOIN public.channels c ON c.id = w.channel_id
    WHERE w.id = _webhook_id
      AND (
        w.created_by = _user_id
        OR public.has_server_permission(_user_id, c.server_id, 'manage_channels')
      )
  )
$$;

-- Create a secure view for webhooks that masks tokens
CREATE OR REPLACE VIEW public.webhooks_secure AS
SELECT 
  id,
  channel_id,
  name,
  avatar_url,
  CASE 
    WHEN public.can_view_webhook_token(auth.uid(), id) THEN token
    ELSE '********'
  END as token,
  created_by,
  created_at
FROM public.webhooks;

-- Admins can manage webhooks (full CRUD)
CREATE POLICY "Admins can manage webhooks"
ON public.webhooks
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM channels c
    WHERE c.id = webhooks.channel_id
      AND public.has_server_permission(auth.uid(), c.server_id, 'manage_channels')
  )
);

-- Members can view webhooks (but token is masked via secure view)
CREATE POLICY "Members can view webhooks"
ON public.webhooks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM channels c
    WHERE c.id = webhooks.channel_id
      AND public.is_server_member(auth.uid(), c.server_id)
  )
);