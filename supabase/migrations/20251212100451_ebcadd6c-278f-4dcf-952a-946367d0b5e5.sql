-- Trigger pour envoyer un message de bienvenue aux nouveaux membres
CREATE OR REPLACE FUNCTION public.send_welcome_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  settings RECORD;
  new_member_profile RECORD;
  server_name TEXT;
  welcome_text TEXT;
BEGIN
  -- Récupérer les paramètres du serveur
  SELECT * INTO settings FROM server_settings WHERE server_id = NEW.server_id;
  
  -- Si pas de settings ou pas de message/channel configuré, on ne fait rien
  IF settings IS NULL OR settings.welcome_message IS NULL OR settings.welcome_channel_id IS NULL OR NOT settings.system_messages_enabled THEN
    RETURN NEW;
  END IF;
  
  -- Récupérer le profil du nouveau membre
  SELECT display_name INTO new_member_profile FROM profiles WHERE id = NEW.user_id;
  
  -- Récupérer le nom du serveur
  SELECT name INTO server_name FROM servers WHERE id = NEW.server_id;
  
  -- Remplacer les variables dans le message
  welcome_text := REPLACE(settings.welcome_message, '{user}', COALESCE(new_member_profile.display_name, 'nouveau membre'));
  welcome_text := REPLACE(welcome_text, '{server}', COALESCE(server_name, 'le serveur'));
  
  -- Insérer le message de bienvenue (author_id NULL pour message système)
  INSERT INTO messages (channel_id, content, author_id)
  VALUES (settings.welcome_channel_id, welcome_text, NULL);
  
  RETURN NEW;
END;
$$;

-- Créer le trigger sur server_members
DROP TRIGGER IF EXISTS on_member_join_welcome ON public.server_members;
CREATE TRIGGER on_member_join_welcome
AFTER INSERT ON public.server_members
FOR EACH ROW
EXECUTE FUNCTION public.send_welcome_message();