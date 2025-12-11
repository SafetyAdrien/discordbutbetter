-- Fix race condition between handle_new_server and handle_new_member triggers
-- Add ON CONFLICT DO NOTHING to prevent duplicate key error on member_roles

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
  
  -- Add owner as member (this will trigger handle_new_member which assigns the role)
  INSERT INTO public.server_members (server_id, user_id)
  VALUES (NEW.id, NEW.owner_id)
  RETURNING id INTO owner_member_id;
  
  -- Assign default role to owner with ON CONFLICT to handle race condition
  -- handle_new_member trigger may have already assigned this role
  INSERT INTO public.member_roles (member_id, role_id)
  VALUES (owner_member_id, default_role_id)
  ON CONFLICT (member_id, role_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;