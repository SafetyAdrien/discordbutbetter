-- Create server_bans table for banned members
CREATE TABLE IF NOT EXISTS public.server_bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  banned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(server_id, user_id)
);

-- Enable RLS on server_bans
ALTER TABLE public.server_bans ENABLE ROW LEVEL SECURITY;

-- RLS policies for server_bans
CREATE POLICY "Owners can manage bans" ON public.server_bans
  FOR ALL USING (public.is_server_owner(auth.uid(), server_id));

CREATE POLICY "Admins can manage bans" ON public.server_bans
  FOR ALL USING (public.has_server_permission(auth.uid(), server_id, 'ban_members'::server_permission));

CREATE POLICY "Members can view bans" ON public.server_bans
  FOR SELECT USING (public.is_server_member(auth.uid(), server_id));

-- Create server_settings table for engagement settings
CREATE TABLE IF NOT EXISTS public.server_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID UNIQUE NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  welcome_message TEXT,
  welcome_channel_id UUID REFERENCES public.channels(id) ON DELETE SET NULL,
  auto_assign_roles UUID[] DEFAULT '{}',
  system_messages_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on server_settings
ALTER TABLE public.server_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for server_settings
CREATE POLICY "Owners can manage server settings" ON public.server_settings
  FOR ALL USING (public.is_server_owner(auth.uid(), server_id));

CREATE POLICY "Admins can manage server settings" ON public.server_settings
  FOR ALL USING (public.has_server_permission(auth.uid(), server_id, 'manage_server'::server_permission));

CREATE POLICY "Members can view server settings" ON public.server_settings
  FOR SELECT USING (public.is_server_member(auth.uid(), server_id));

-- Create kick_member RPC function
CREATE OR REPLACE FUNCTION public.kick_member(_server_id uuid, _user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_server_owner(auth.uid(), _server_id) 
     AND NOT has_server_permission(auth.uid(), _server_id, 'kick_members'::server_permission) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  
  -- Cannot kick the owner
  IF EXISTS (SELECT 1 FROM servers WHERE id = _server_id AND owner_id = _user_id) THEN
    RAISE EXCEPTION 'Cannot kick the server owner';
  END IF;
  
  DELETE FROM public.server_members 
  WHERE server_id = _server_id AND user_id = _user_id;
END;
$$;

-- Create ban_member RPC function
CREATE OR REPLACE FUNCTION public.ban_member(_server_id uuid, _user_id uuid, _reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_server_owner(auth.uid(), _server_id) 
     AND NOT has_server_permission(auth.uid(), _server_id, 'ban_members'::server_permission) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  
  -- Cannot ban the owner
  IF EXISTS (SELECT 1 FROM servers WHERE id = _server_id AND owner_id = _user_id) THEN
    RAISE EXCEPTION 'Cannot ban the server owner';
  END IF;
  
  -- Add to bans table
  INSERT INTO public.server_bans (server_id, user_id, banned_by, reason)
  VALUES (_server_id, _user_id, auth.uid(), _reason)
  ON CONFLICT (server_id, user_id) DO NOTHING;
  
  -- Remove from members
  DELETE FROM public.server_members 
  WHERE server_id = _server_id AND user_id = _user_id;
END;
$$;

-- Create unban_member RPC function
CREATE OR REPLACE FUNCTION public.unban_member(_server_id uuid, _user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_server_owner(auth.uid(), _server_id) 
     AND NOT has_server_permission(auth.uid(), _server_id, 'ban_members'::server_permission) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  
  DELETE FROM public.server_bans 
  WHERE server_id = _server_id AND user_id = _user_id;
END;
$$;