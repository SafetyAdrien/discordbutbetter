-- Structure par defaut d'un nouveau serveur, alignee sur Discord :
--   Salons textuels  > # général
--   Salons vocaux    > Général (vocal)
-- Avant : une seule categorie "Salons textuels" contenant aussi "Vocal Général".
-- Role @everyone, permissions et ajout du proprietaire inchanges.
CREATE OR REPLACE FUNCTION public.handle_new_server()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  text_category_id UUID;
  voice_category_id UUID;
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
  RETURNING id INTO text_category_id;

  INSERT INTO public.categories (server_id, name, position)
  VALUES (NEW.id, 'Salons vocaux', 1)
  RETURNING id INTO voice_category_id;

  INSERT INTO public.channels (server_id, category_id, name, type, position)
  VALUES (NEW.id, text_category_id, 'général', 'text', 0);

  INSERT INTO public.channels (server_id, category_id, name, type, position)
  VALUES (NEW.id, voice_category_id, 'Général', 'voice', 0);

  INSERT INTO public.server_members (server_id, user_id)
  VALUES (NEW.id, NEW.owner_id)
  RETURNING id INTO owner_member_id;

  INSERT INTO public.member_roles (member_id, role_id)
  VALUES (owner_member_id, default_role_id)
  ON CONFLICT (member_id, role_id) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_server() FROM anon, authenticated, PUBLIC;
