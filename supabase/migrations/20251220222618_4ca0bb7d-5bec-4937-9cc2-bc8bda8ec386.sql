-- Add view_channel to the default permissions in handle_new_server function
CREATE OR REPLACE FUNCTION public.handle_new_server()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  default_category_id UUID;
  default_role_id UUID;
  owner_member_id UUID;
BEGIN
  -- Create default @everyone role
  INSERT INTO public.roles (server_id, name, color, position, is_default)
  VALUES (NEW.id, '@everyone', '#99AAB5', 0, true)
  RETURNING id INTO default_role_id;
  
  -- Add basic permissions to default role (including view_channel)
  INSERT INTO public.role_permissions (role_id, permission) VALUES
    (default_role_id, 'send_messages'),
    (default_role_id, 'read_messages'),
    (default_role_id, 'connect_voice'),
    (default_role_id, 'speak_voice'),
    (default_role_id, 'view_channel');
  
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
$function$;

-- Add view_channel permission to all existing @everyone roles that don't have it
INSERT INTO public.role_permissions (role_id, permission)
SELECT r.id, 'view_channel'::server_permission
FROM public.roles r
WHERE r.is_default = true
  AND NOT EXISTS (
    SELECT 1 FROM public.role_permissions rp 
    WHERE rp.role_id = r.id AND rp.permission = 'view_channel'
  );