-- ================================================
-- PHASE 1 & 2: Base de données complète Discord-like
-- ================================================

-- Types personnalisés
CREATE TYPE public.user_status AS ENUM ('online', 'idle', 'dnd', 'offline');
CREATE TYPE public.channel_type AS ENUM ('text', 'voice', 'forum', 'announcement');
CREATE TYPE public.friendship_status AS ENUM ('pending', 'accepted', 'blocked');
CREATE TYPE public.server_permission AS ENUM (
  'manage_server', 'manage_channels', 'manage_roles', 
  'kick_members', 'ban_members', 'manage_messages',
  'send_messages', 'read_messages', 'connect_voice', 
  'speak_voice', 'mention_everyone', 'administrator'
);

-- ================================================
-- TABLE: profiles (utilisateurs)
-- ================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  banner_url TEXT,
  status user_status DEFAULT 'offline',
  custom_status TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ================================================
-- TABLE: servers
-- ================================================
CREATE TABLE public.servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon_url TEXT,
  banner_url TEXT,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.servers ENABLE ROW LEVEL SECURITY;

-- ================================================
-- TABLE: server_members
-- ================================================
CREATE TABLE public.server_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID REFERENCES public.servers(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  nickname TEXT,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(server_id, user_id)
);

ALTER TABLE public.server_members ENABLE ROW LEVEL SECURITY;

-- ================================================
-- TABLE: roles
-- ================================================
CREATE TABLE public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID REFERENCES public.servers(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#99AAB5',
  icon_url TEXT,
  position INTEGER DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- ================================================
-- TABLE: role_permissions
-- ================================================
CREATE TABLE public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE NOT NULL,
  permission server_permission NOT NULL,
  UNIQUE(role_id, permission)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- ================================================
-- TABLE: member_roles
-- ================================================
CREATE TABLE public.member_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES public.server_members(id) ON DELETE CASCADE NOT NULL,
  role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(member_id, role_id)
);

ALTER TABLE public.member_roles ENABLE ROW LEVEL SECURITY;

-- ================================================
-- TABLE: categories
-- ================================================
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID REFERENCES public.servers(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- ================================================
-- TABLE: channels
-- ================================================
CREATE TABLE public.channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  server_id UUID REFERENCES public.servers(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type channel_type DEFAULT 'text',
  description TEXT,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

-- ================================================
-- TABLE: messages
-- ================================================
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  edited_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- ================================================
-- TABLE: reactions
-- ================================================
CREATE TABLE public.reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;

-- ================================================
-- TABLE: dm_conversations
-- ================================================
CREATE TABLE public.dm_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_group BOOLEAN DEFAULT false,
  name TEXT,
  icon_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.dm_conversations ENABLE ROW LEVEL SECURITY;

-- ================================================
-- TABLE: dm_participants
-- ================================================
CREATE TABLE public.dm_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.dm_conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

ALTER TABLE public.dm_participants ENABLE ROW LEVEL SECURITY;

-- ================================================
-- TABLE: dm_messages
-- ================================================
CREATE TABLE public.dm_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.dm_conversations(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.dm_messages ENABLE ROW LEVEL SECURITY;

-- Enable realtime for dm_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_messages;

-- ================================================
-- TABLE: friendships
-- ================================================
CREATE TABLE public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  friend_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status friendship_status DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- ================================================
-- TABLE: voice_states
-- ================================================
CREATE TABLE public.voice_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE NOT NULL,
  muted BOOLEAN DEFAULT false,
  deafened BOOLEAN DEFAULT false,
  streaming BOOLEAN DEFAULT false,
  camera BOOLEAN DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, channel_id)
);

ALTER TABLE public.voice_states ENABLE ROW LEVEL SECURITY;

-- Enable realtime for voice_states
ALTER PUBLICATION supabase_realtime ADD TABLE public.voice_states;

-- ================================================
-- SECURITY DEFINER FUNCTIONS
-- ================================================

-- Check if user is member of server
CREATE OR REPLACE FUNCTION public.is_server_member(_user_id UUID, _server_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.server_members
    WHERE user_id = _user_id AND server_id = _server_id
  )
$$;

-- Check if user is server owner
CREATE OR REPLACE FUNCTION public.is_server_owner(_user_id UUID, _server_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.servers
    WHERE id = _server_id AND owner_id = _user_id
  )
$$;

-- Check if user has permission in server
CREATE OR REPLACE FUNCTION public.has_server_permission(_user_id UUID, _server_id UUID, _permission server_permission)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.server_members sm
    JOIN public.member_roles mr ON mr.member_id = sm.id
    JOIN public.role_permissions rp ON rp.role_id = mr.role_id
    WHERE sm.user_id = _user_id 
      AND sm.server_id = _server_id 
      AND (rp.permission = _permission OR rp.permission = 'administrator')
  ) OR public.is_server_owner(_user_id, _server_id)
$$;

-- Check if user is participant in DM conversation
CREATE OR REPLACE FUNCTION public.is_dm_participant(_user_id UUID, _conversation_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.dm_participants
    WHERE user_id = _user_id AND conversation_id = _conversation_id
  )
$$;

-- ================================================
-- RLS POLICIES
-- ================================================

-- Servers policies
CREATE POLICY "Public servers are viewable by everyone" ON public.servers
  FOR SELECT USING (is_public = true OR public.is_server_member(auth.uid(), id) OR owner_id = auth.uid());

CREATE POLICY "Server members can view their servers" ON public.servers
  FOR SELECT USING (public.is_server_member(auth.uid(), id));

CREATE POLICY "Authenticated users can create servers" ON public.servers
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Server owners can update their servers" ON public.servers
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Server owners can delete their servers" ON public.servers
  FOR DELETE USING (auth.uid() = owner_id);

-- Server members policies
CREATE POLICY "Members can view server members" ON public.server_members
  FOR SELECT USING (public.is_server_member(auth.uid(), server_id));

CREATE POLICY "Users can join public servers" ON public.server_members
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND 
    (SELECT is_public FROM public.servers WHERE id = server_id)
  );

CREATE POLICY "Server owners can manage members" ON public.server_members
  FOR ALL USING (public.is_server_owner(auth.uid(), server_id));

-- Roles policies
CREATE POLICY "Members can view roles" ON public.roles
  FOR SELECT USING (public.is_server_member(auth.uid(), server_id));

CREATE POLICY "Admins can manage roles" ON public.roles
  FOR ALL USING (public.has_server_permission(auth.uid(), server_id, 'manage_roles'));

-- Role permissions policies
CREATE POLICY "Members can view role permissions" ON public.role_permissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.roles r
      WHERE r.id = role_id AND public.is_server_member(auth.uid(), r.server_id)
    )
  );

CREATE POLICY "Admins can manage role permissions" ON public.role_permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.roles r
      WHERE r.id = role_id AND public.has_server_permission(auth.uid(), r.server_id, 'manage_roles')
    )
  );

-- Member roles policies
CREATE POLICY "Members can view member roles" ON public.member_roles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.server_members sm
      WHERE sm.id = member_id AND public.is_server_member(auth.uid(), sm.server_id)
    )
  );

CREATE POLICY "Admins can manage member roles" ON public.member_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.server_members sm
      WHERE sm.id = member_id AND public.has_server_permission(auth.uid(), sm.server_id, 'manage_roles')
    )
  );

-- Categories policies
CREATE POLICY "Members can view categories" ON public.categories
  FOR SELECT USING (public.is_server_member(auth.uid(), server_id));

CREATE POLICY "Admins can manage categories" ON public.categories
  FOR ALL USING (public.has_server_permission(auth.uid(), server_id, 'manage_channels'));

-- Channels policies
CREATE POLICY "Members can view channels" ON public.channels
  FOR SELECT USING (public.is_server_member(auth.uid(), server_id));

CREATE POLICY "Admins can manage channels" ON public.channels
  FOR ALL USING (public.has_server_permission(auth.uid(), server_id, 'manage_channels'));

-- Messages policies
CREATE POLICY "Members can view messages" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.channels c
      WHERE c.id = channel_id AND public.is_server_member(auth.uid(), c.server_id)
    )
  );

CREATE POLICY "Members can send messages" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = author_id AND
    EXISTS (
      SELECT 1 FROM public.channels c
      WHERE c.id = channel_id AND public.is_server_member(auth.uid(), c.server_id)
    )
  );

CREATE POLICY "Authors can edit their messages" ON public.messages
  FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Authors can delete their messages" ON public.messages
  FOR DELETE USING (auth.uid() = author_id);

-- Reactions policies
CREATE POLICY "Members can view reactions" ON public.reactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.channels c ON c.id = m.channel_id
      WHERE m.id = message_id AND public.is_server_member(auth.uid(), c.server_id)
    )
  );

CREATE POLICY "Members can add reactions" ON public.reactions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.channels c ON c.id = m.channel_id
      WHERE m.id = message_id AND public.is_server_member(auth.uid(), c.server_id)
    )
  );

CREATE POLICY "Users can remove their reactions" ON public.reactions
  FOR DELETE USING (auth.uid() = user_id);

-- DM conversations policies
CREATE POLICY "Participants can view conversations" ON public.dm_conversations
  FOR SELECT USING (public.is_dm_participant(auth.uid(), id));

CREATE POLICY "Users can create conversations" ON public.dm_conversations
  FOR INSERT WITH CHECK (true);

-- DM participants policies
CREATE POLICY "Participants can view participants" ON public.dm_participants
  FOR SELECT USING (public.is_dm_participant(auth.uid(), conversation_id));

CREATE POLICY "Users can add themselves to conversations" ON public.dm_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- DM messages policies
CREATE POLICY "Participants can view dm messages" ON public.dm_messages
  FOR SELECT USING (public.is_dm_participant(auth.uid(), conversation_id));

CREATE POLICY "Participants can send dm messages" ON public.dm_messages
  FOR INSERT WITH CHECK (
    auth.uid() = author_id AND 
    public.is_dm_participant(auth.uid(), conversation_id)
  );

-- Friendships policies
CREATE POLICY "Users can view their friendships" ON public.friendships
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can create friend requests" ON public.friendships
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update friendship status" ON public.friendships
  FOR UPDATE USING (auth.uid() = friend_id OR auth.uid() = user_id);

CREATE POLICY "Users can delete friendships" ON public.friendships
  FOR DELETE USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Voice states policies
CREATE POLICY "Members can view voice states" ON public.voice_states
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.channels c
      WHERE c.id = channel_id AND public.is_server_member(auth.uid(), c.server_id)
    )
  );

CREATE POLICY "Users can manage their voice state" ON public.voice_states
  FOR ALL USING (auth.uid() = user_id);

-- ================================================
-- TRIGGERS
-- ================================================

-- Create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create default role when server is created
CREATE OR REPLACE FUNCTION public.handle_new_server()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_category_id UUID;
  default_role_id UUID;
  owner_member_id UUID;
BEGIN
  -- Create default @everyone role
  INSERT INTO public.roles (server_id, name, color, position, is_default)
  VALUES (NEW.id, '@everyone', '#99AAB5', 0, true)
  RETURNING id INTO default_role_id;
  
  -- Add basic permissions to default role
  INSERT INTO public.role_permissions (role_id, permission) VALUES
    (default_role_id, 'send_messages'),
    (default_role_id, 'read_messages'),
    (default_role_id, 'connect_voice'),
    (default_role_id, 'speak_voice');
  
  -- Create default category
  INSERT INTO public.categories (server_id, name, position)
  VALUES (NEW.id, 'Salons textuels', 0)
  RETURNING id INTO default_category_id;
  
  -- Create default text channel
  INSERT INTO public.channels (server_id, category_id, name, type, position)
  VALUES (NEW.id, default_category_id, 'général', 'text', 0);
  
  -- Create default voice channel
  INSERT INTO public.channels (server_id, category_id, name, type, position)
  VALUES (NEW.id, default_category_id, 'Vocal Général', 'voice', 1);
  
  -- Add owner as member
  INSERT INTO public.server_members (server_id, user_id)
  VALUES (NEW.id, NEW.owner_id)
  RETURNING id INTO owner_member_id;
  
  -- Assign default role to owner
  INSERT INTO public.member_roles (member_id, role_id)
  VALUES (owner_member_id, default_role_id);
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_server_created
  AFTER INSERT ON public.servers
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_server();

-- Assign default role when member joins
CREATE OR REPLACE FUNCTION public.handle_new_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_role_id UUID;
BEGIN
  -- Get default role for server
  SELECT id INTO default_role_id
  FROM public.roles
  WHERE server_id = NEW.server_id AND is_default = true;
  
  -- Assign default role if exists
  IF default_role_id IS NOT NULL THEN
    INSERT INTO public.member_roles (member_id, role_id)
    VALUES (NEW.id, default_role_id)
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_member_joined
  AFTER INSERT ON public.server_members
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_member();

-- Update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_servers_updated_at
  BEFORE UPDATE ON public.servers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();