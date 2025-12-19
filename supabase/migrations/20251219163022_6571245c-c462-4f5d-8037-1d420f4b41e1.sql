-- Fonction pour vérifier si un utilisateur a une permission sur un salon spécifique
-- Respecte la hiérarchie : salon (override) → catégorie (override) → rôle du serveur
CREATE OR REPLACE FUNCTION public.has_channel_permission(
  _user_id uuid, 
  _channel_id uuid, 
  _permission server_permission
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _server_id uuid;
  _category_id uuid;
  _channel_override text;
  _category_override text;
  _has_role_permission boolean;
BEGIN
  -- Récupérer le server_id et category_id du salon
  SELECT server_id, category_id INTO _server_id, _category_id
  FROM channels WHERE id = _channel_id;
  
  IF _server_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Vérifier si l'utilisateur est propriétaire du serveur (toujours autorisé)
  IF is_server_owner(_user_id, _server_id) THEN
    RETURN true;
  END IF;
  
  -- Vérifier si l'utilisateur est membre du serveur
  IF NOT is_server_member(_user_id, _server_id) THEN
    RETURN false;
  END IF;
  
  -- 1. Vérifier les overrides au niveau du salon
  SELECT cpo.type INTO _channel_override
  FROM channel_permission_overrides cpo
  JOIN server_members sm ON sm.server_id = _server_id AND sm.user_id = _user_id
  JOIN member_roles mr ON mr.member_id = sm.id
  WHERE cpo.channel_id = _channel_id
    AND cpo.role_id = mr.role_id
    AND cpo.permission = _permission
  ORDER BY 
    -- Priorité : deny > allow (si plusieurs rôles ont des overrides différents)
    CASE WHEN cpo.type = 'deny' THEN 0 ELSE 1 END
  LIMIT 1;
  
  -- Si un override de salon existe
  IF _channel_override IS NOT NULL THEN
    RETURN _channel_override = 'allow';
  END IF;
  
  -- 2. Vérifier les overrides au niveau de la catégorie (si le salon appartient à une catégorie)
  IF _category_id IS NOT NULL THEN
    SELECT cpo.type INTO _category_override
    FROM category_permission_overrides cpo
    JOIN server_members sm ON sm.server_id = _server_id AND sm.user_id = _user_id
    JOIN member_roles mr ON mr.member_id = sm.id
    WHERE cpo.category_id = _category_id
      AND cpo.role_id = mr.role_id
      AND cpo.permission = _permission
    ORDER BY 
      CASE WHEN cpo.type = 'deny' THEN 0 ELSE 1 END
    LIMIT 1;
    
    -- Si un override de catégorie existe
    IF _category_override IS NOT NULL THEN
      RETURN _category_override = 'allow';
    END IF;
  END IF;
  
  -- 3. Fallback : vérifier les permissions du rôle au niveau serveur
  SELECT EXISTS (
    SELECT 1 FROM server_members sm
    JOIN member_roles mr ON mr.member_id = sm.id
    JOIN role_permissions rp ON rp.role_id = mr.role_id
    WHERE sm.user_id = _user_id 
      AND sm.server_id = _server_id 
      AND (rp.permission = _permission OR rp.permission = 'administrator')
  ) INTO _has_role_permission;
  
  RETURN _has_role_permission;
END;
$$;

-- Fonction pour récupérer toutes les permissions effectives d'un utilisateur sur un salon
CREATE OR REPLACE FUNCTION public.get_user_channel_permissions(_user_id uuid, _channel_id uuid)
RETURNS TABLE(permission server_permission, granted boolean)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  all_perms server_permission[] := ARRAY[
    'read_messages', 'send_messages', 'manage_messages', 
    'connect_voice', 'speak_voice', 'mention_everyone',
    'manage_channels', 'manage_roles', 'kick_members', 
    'ban_members', 'manage_server', 'administrator',
    'mute_members', 'move_members', 'create_invites'
  ]::server_permission[];
  perm server_permission;
BEGIN
  FOREACH perm IN ARRAY all_perms
  LOOP
    permission := perm;
    granted := has_channel_permission(_user_id, _channel_id, perm);
    RETURN NEXT;
  END LOOP;
END;
$$;