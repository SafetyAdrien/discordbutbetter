
-- Create server_profiles table for per-server profile overrides
CREATE TABLE public.server_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  server_id uuid NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  banner_url text,
  bio text,
  pronouns text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, server_id)
);

-- Enable RLS
ALTER TABLE public.server_profiles ENABLE ROW LEVEL SECURITY;

-- Members of the server can view server profiles
CREATE POLICY "Members can view server profiles"
ON public.server_profiles
FOR SELECT
USING (is_server_member(auth.uid(), server_id));

-- Users can insert their own server profile
CREATE POLICY "Users can insert own server profile"
ON public.server_profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id AND is_server_member(auth.uid(), server_id));

-- Users can update their own server profile
CREATE POLICY "Users can update own server profile"
ON public.server_profiles
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own server profile
CREATE POLICY "Users can delete own server profile"
ON public.server_profiles
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_server_profiles_updated_at
BEFORE UPDATE ON public.server_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.server_profiles;
