-- Add vote_in_polls to all existing @everyone roles
INSERT INTO public.role_permissions (role_id, permission)
SELECT r.id, 'vote_in_polls'::server_permission
FROM public.roles r WHERE r.is_default = true
ON CONFLICT DO NOTHING;

-- Update handle_new_server to include vote_in_polls for future servers
CREATE OR REPLACE FUNCTION public.handle_new_server()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_category_id UUID;
  default_role_id UUID;
  owner_member_id UUID;
BEGIN
  INSERT INTO public.roles (server_id, name, color, position, is_default)
  VALUES (NEW.id, '@everyone', '#99AAB5', 0, true)
  RETURNING id INTO default_role_id;
  
  INSERT INTO public.role_permissions (role_id, permission) VALUES
    (default_role_id, 'send_messages'),
    (default_role_id, 'read_messages'),
    (default_role_id, 'connect_voice'),
    (default_role_id, 'speak_voice'),
    (default_role_id, 'view_channel'),
    (default_role_id, 'vote_in_polls');
  
  INSERT INTO public.categories (server_id, name, position)
  VALUES (NEW.id, 'Salons textuels', 0)
  RETURNING id INTO default_category_id;
  
  INSERT INTO public.channels (server_id, category_id, name, type, position)
  VALUES (NEW.id, default_category_id, 'général', 'text', 0);
  
  INSERT INTO public.channels (server_id, category_id, name, type, position)
  VALUES (NEW.id, default_category_id, 'Vocal Général', 'voice', 1);
  
  INSERT INTO public.server_members (server_id, user_id)
  VALUES (NEW.id, NEW.owner_id)
  RETURNING id INTO owner_member_id;
  
  INSERT INTO public.member_roles (member_id, role_id)
  VALUES (owner_member_id, default_role_id)
  ON CONFLICT (member_id, role_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;