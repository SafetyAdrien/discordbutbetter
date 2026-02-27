
CREATE OR REPLACE FUNCTION has_channel_permission(
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
  _everyone_channel_override text;
  _everyone_category_override text;
  _has_role_permission boolean;
  _is_admin boolean;
  _everyone_role_id uuid;
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
  
  -- Vérifier si l'utilisateur a la permission administrator (bypass tout)
  SELECT EXISTS (
    SELECT 1 FROM server_members sm
    JOIN member_roles mr ON mr.member_id = sm.id
    JOIN role_permissions rp ON rp.role_id = mr.role_id
    WHERE sm.user_id = _user_id 
      AND sm.server_id = _server_id 
      AND rp.permission = 'administrator'
  ) INTO _is_admin;
  
  IF _is_admin THEN
    RETURN true;
  END IF;
  
  -- Récupérer l'ID du rôle @everyone pour ce serveur
  SELECT id INTO _everyone_role_id
  FROM roles WHERE server_id = _server_id AND is_default = true
  LIMIT 1;
  
  -- 1. Vérifier les overrides au niveau du salon pour les rôles explicites de l'utilisateur
  SELECT cpo.type INTO _channel_override
  FROM channel_permission_overrides cpo
  JOIN server_members sm ON sm.server_id = _server_id AND sm.user_id = _user_id
  JOIN member_roles mr ON mr.member_id = sm.id
  WHERE cpo.channel_id = _channel_id
    AND cpo.role_id = mr.role_id
    AND cpo.permission = _permission
  ORDER BY 
    CASE WHEN cpo.type = 'deny' THEN 0 ELSE 1 END
  LIMIT 1;
  
  -- Si un override de salon existe pour un rôle explicite, il a priorité
  IF _channel_override IS NOT NULL THEN
    RETURN _channel_override = 'allow';
  END IF;
  
  -- 1b. Vérifier les overrides au niveau du salon pour @everyone
  IF _everyone_role_id IS NOT NULL THEN
    SELECT cpo.type INTO _everyone_channel_override
    FROM channel_permission_overrides cpo
    WHERE cpo.channel_id = _channel_id
      AND cpo.role_id = _everyone_role_id
      AND cpo.permission = _permission
    LIMIT 1;
    
    IF _everyone_channel_override IS NOT NULL THEN
      RETURN _everyone_channel_override = 'allow';
    END IF;
  END IF;
  
  -- 2. Vérifier les overrides au niveau de la catégorie pour les rôles explicites
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
    
    IF _category_override IS NOT NULL THEN
      RETURN _category_override = 'allow';
    END IF;
    
    -- 2b. Vérifier les overrides de catégorie pour @everyone
    IF _everyone_role_id IS NOT NULL THEN
      SELECT cpo.type INTO _everyone_category_override
      FROM category_permission_overrides cpo
      WHERE cpo.category_id = _category_id
        AND cpo.role_id = _everyone_role_id
        AND cpo.permission = _permission
      LIMIT 1;
      
      IF _everyone_category_override IS NOT NULL THEN
        RETURN _everyone_category_override = 'allow';
      END IF;
    END IF;
  END IF;
  
  -- 3. Fallback : vérifier les permissions du rôle au niveau serveur
  SELECT EXISTS (
    SELECT 1 FROM server_members sm
    JOIN member_roles mr ON mr.member_id = sm.id
    JOIN role_permissions rp ON rp.role_id = mr.role_id
    WHERE sm.user_id = _user_id 
      AND sm.server_id = _server_id 
      AND rp.permission = _permission
  ) INTO _has_role_permission;
  
  RETURN _has_role_permission;
END;
$$;
