-- Create channel_permission_overrides table for per-channel permission management
CREATE TABLE public.channel_permission_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
  permission public.server_permission NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('allow', 'deny')),
  sync_with_category BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(channel_id, role_id, permission)
);

-- Create webhooks table for channel integrations
CREATE TABLE public.webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.channel_permission_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;

-- RLS for channel_permission_overrides
CREATE POLICY "Members can view channel permission overrides"
ON public.channel_permission_overrides
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.channels c
    WHERE c.id = channel_permission_overrides.channel_id
    AND public.is_server_member(auth.uid(), c.server_id)
  )
);

CREATE POLICY "Admins can manage channel permission overrides"
ON public.channel_permission_overrides
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.channels c
    WHERE c.id = channel_permission_overrides.channel_id
    AND public.has_server_permission(auth.uid(), c.server_id, 'manage_channels')
  )
);

-- RLS for webhooks
CREATE POLICY "Members can view webhooks"
ON public.webhooks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.channels c
    WHERE c.id = webhooks.channel_id
    AND public.is_server_member(auth.uid(), c.server_id)
  )
);

CREATE POLICY "Admins can manage webhooks"
ON public.webhooks
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.channels c
    WHERE c.id = webhooks.channel_id
    AND public.has_server_permission(auth.uid(), c.server_id, 'manage_channels')
  )
);