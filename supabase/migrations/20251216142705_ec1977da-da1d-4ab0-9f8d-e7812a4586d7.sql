-- Create server_emojis table
CREATE TABLE public.server_emojis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  creator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create server_stickers table
CREATE TABLE public.server_stickers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  creator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.server_emojis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.server_stickers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for server_emojis
CREATE POLICY "Members can view server emojis"
ON public.server_emojis
FOR SELECT
USING (is_server_member(auth.uid(), server_id));

CREATE POLICY "Admins can manage server emojis"
ON public.server_emojis
FOR ALL
USING (has_server_permission(auth.uid(), server_id, 'manage_server'::server_permission));

-- RLS Policies for server_stickers
CREATE POLICY "Members can view server stickers"
ON public.server_stickers
FOR SELECT
USING (is_server_member(auth.uid(), server_id));

CREATE POLICY "Admins can manage server stickers"
ON public.server_stickers
FOR ALL
USING (has_server_permission(auth.uid(), server_id, 'manage_server'::server_permission));