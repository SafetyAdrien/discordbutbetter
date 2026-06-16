
-- =============================================================================
-- AUDIT LOG TRIGGERS — Discord-style server activity tracking
-- =============================================================================

-- Helper: safe insert that no-ops when there is no authenticated actor
CREATE OR REPLACE FUNCTION public._audit(
  _server_id uuid,
  _action_type text,
  _target_id uuid,
  _details jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR _server_id IS NULL THEN
    RETURN;
  END IF;
  INSERT INTO public.audit_logs (server_id, actor_id, action_type, target_id, details)
  VALUES (_server_id, auth.uid(), _action_type, _target_id, COALESCE(_details, '{}'::jsonb));
END;
$$;

-- =============================================================================
-- servers UPDATE → server_update (diff fields)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.trg_audit_servers_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _changes jsonb := '{}'::jsonb;
BEGIN
  IF NEW.name IS DISTINCT FROM OLD.name THEN
    _changes := _changes || jsonb_build_object('name', jsonb_build_object('old', OLD.name, 'new', NEW.name));
  END IF;
  IF NEW.icon_url IS DISTINCT FROM OLD.icon_url THEN
    _changes := _changes || jsonb_build_object('icon_url', jsonb_build_object('old', OLD.icon_url, 'new', NEW.icon_url));
  END IF;
  IF NEW.banner_url IS DISTINCT FROM OLD.banner_url THEN
    _changes := _changes || jsonb_build_object('banner_url', jsonb_build_object('old', OLD.banner_url, 'new', NEW.banner_url));
  END IF;
  IF NEW.description IS DISTINCT FROM OLD.description THEN
    _changes := _changes || jsonb_build_object('description', jsonb_build_object('old', OLD.description, 'new', NEW.description));
  END IF;
  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
    _changes := _changes || jsonb_build_object('owner_id', jsonb_build_object('old', OLD.owner_id, 'new', NEW.owner_id));
  END IF;
  IF NEW.secondary_owner_id IS DISTINCT FROM OLD.secondary_owner_id THEN
    _changes := _changes || jsonb_build_object('secondary_owner_id', jsonb_build_object('old', OLD.secondary_owner_id, 'new', NEW.secondary_owner_id));
  END IF;
  IF NEW.is_public IS DISTINCT FROM OLD.is_public THEN
    _changes := _changes || jsonb_build_object('is_public', jsonb_build_object('old', OLD.is_public, 'new', NEW.is_public));
  END IF;
  IF _changes <> '{}'::jsonb THEN
    PERFORM public._audit(NEW.id, 'server_update', NULL, jsonb_build_object('name', NEW.name, 'changes', _changes));
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS audit_servers_update ON public.servers;
CREATE TRIGGER audit_servers_update AFTER UPDATE ON public.servers
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_servers_update();

-- =============================================================================
-- server_members DELETE → member_kick (only when actor != removed user)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.trg_audit_member_kick()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> OLD.user_id THEN
    PERFORM public._audit(OLD.server_id, 'member_kick', OLD.user_id, '{}'::jsonb);
  END IF;
  RETURN OLD;
END;
$$;
DROP TRIGGER IF EXISTS audit_member_kick ON public.server_members;
CREATE TRIGGER audit_member_kick AFTER DELETE ON public.server_members
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_member_kick();

-- =============================================================================
-- server_bans INSERT/DELETE
-- =============================================================================
CREATE OR REPLACE FUNCTION public.trg_audit_bans()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public._audit(NEW.server_id, 'member_ban', NEW.user_id,
      jsonb_build_object('reason', NEW.reason));
    RETURN NEW;
  ELSE
    PERFORM public._audit(OLD.server_id, 'member_unban', OLD.user_id, '{}'::jsonb);
    RETURN OLD;
  END IF;
END;
$$;
DROP TRIGGER IF EXISTS audit_bans ON public.server_bans;
CREATE TRIGGER audit_bans AFTER INSERT OR DELETE ON public.server_bans
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_bans();

-- =============================================================================
-- roles INSERT/UPDATE/DELETE
-- =============================================================================
CREATE OR REPLACE FUNCTION public.trg_audit_roles()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _changes jsonb := '{}'::jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public._audit(NEW.server_id, 'role_create', NULL,
      jsonb_build_object('role_id', NEW.id, 'role_name', NEW.name, 'color', NEW.color));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.name IS DISTINCT FROM OLD.name THEN
      _changes := _changes || jsonb_build_object('name', jsonb_build_object('old', OLD.name, 'new', NEW.name));
    END IF;
    IF NEW.color IS DISTINCT FROM OLD.color THEN
      _changes := _changes || jsonb_build_object('color', jsonb_build_object('old', OLD.color, 'new', NEW.color));
    END IF;
    IF NEW.hoist IS DISTINCT FROM OLD.hoist THEN
      _changes := _changes || jsonb_build_object('hoist', jsonb_build_object('old', OLD.hoist, 'new', NEW.hoist));
    END IF;
    IF NEW.position IS DISTINCT FROM OLD.position THEN
      _changes := _changes || jsonb_build_object('position', jsonb_build_object('old', OLD.position, 'new', NEW.position));
    END IF;
    IF NEW.icon_url IS DISTINCT FROM OLD.icon_url THEN
      _changes := _changes || jsonb_build_object('icon_url', jsonb_build_object('old', OLD.icon_url, 'new', NEW.icon_url));
    END IF;
    IF _changes <> '{}'::jsonb THEN
      PERFORM public._audit(NEW.server_id, 'role_update', NULL,
        jsonb_build_object('role_id', NEW.id, 'role_name', NEW.name, 'changes', _changes));
    END IF;
    RETURN NEW;
  ELSE
    PERFORM public._audit(OLD.server_id, 'role_delete', NULL,
      jsonb_build_object('role_id', OLD.id, 'role_name', OLD.name));
    RETURN OLD;
  END IF;
END;
$$;
DROP TRIGGER IF EXISTS audit_roles ON public.roles;
CREATE TRIGGER audit_roles AFTER INSERT OR UPDATE OR DELETE ON public.roles
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_roles();

-- =============================================================================
-- member_roles INSERT/DELETE → resolve server_id via server_members
-- =============================================================================
CREATE OR REPLACE FUNCTION public.trg_audit_member_roles()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _server_id uuid; _user_id uuid; _role_name text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT sm.server_id, sm.user_id INTO _server_id, _user_id
      FROM server_members sm WHERE sm.id = NEW.member_id;
    SELECT name INTO _role_name FROM roles WHERE id = NEW.role_id;
    PERFORM public._audit(_server_id, 'member_role_add', _user_id,
      jsonb_build_object('role_id', NEW.role_id, 'role_name', _role_name));
    RETURN NEW;
  ELSE
    SELECT sm.server_id, sm.user_id INTO _server_id, _user_id
      FROM server_members sm WHERE sm.id = OLD.member_id;
    SELECT name INTO _role_name FROM roles WHERE id = OLD.role_id;
    PERFORM public._audit(_server_id, 'member_role_remove', _user_id,
      jsonb_build_object('role_id', OLD.role_id, 'role_name', _role_name));
    RETURN OLD;
  END IF;
END;
$$;
DROP TRIGGER IF EXISTS audit_member_roles ON public.member_roles;
CREATE TRIGGER audit_member_roles AFTER INSERT OR DELETE ON public.member_roles
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_member_roles();

-- =============================================================================
-- role_permissions INSERT/DELETE
-- =============================================================================
CREATE OR REPLACE FUNCTION public.trg_audit_role_perms()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _server_id uuid; _role_name text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT server_id, name INTO _server_id, _role_name FROM roles WHERE id = NEW.role_id;
    PERFORM public._audit(_server_id, 'role_permission_grant', NULL,
      jsonb_build_object('role_id', NEW.role_id, 'role_name', _role_name, 'permission', NEW.permission));
    RETURN NEW;
  ELSE
    SELECT server_id, name INTO _server_id, _role_name FROM roles WHERE id = OLD.role_id;
    PERFORM public._audit(_server_id, 'role_permission_revoke', NULL,
      jsonb_build_object('role_id', OLD.role_id, 'role_name', _role_name, 'permission', OLD.permission));
    RETURN OLD;
  END IF;
END;
$$;
DROP TRIGGER IF EXISTS audit_role_perms ON public.role_permissions;
CREATE TRIGGER audit_role_perms AFTER INSERT OR DELETE ON public.role_permissions
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_role_perms();

-- =============================================================================
-- categories INSERT/UPDATE/DELETE
-- =============================================================================
CREATE OR REPLACE FUNCTION public.trg_audit_categories()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _changes jsonb := '{}'::jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public._audit(NEW.server_id, 'category_create', NULL,
      jsonb_build_object('category_id', NEW.id, 'name', NEW.name));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.name IS DISTINCT FROM OLD.name THEN
      _changes := _changes || jsonb_build_object('name', jsonb_build_object('old', OLD.name, 'new', NEW.name));
    END IF;
    IF NEW.position IS DISTINCT FROM OLD.position THEN
      _changes := _changes || jsonb_build_object('position', jsonb_build_object('old', OLD.position, 'new', NEW.position));
    END IF;
    IF _changes <> '{}'::jsonb THEN
      PERFORM public._audit(NEW.server_id, 'category_update', NULL,
        jsonb_build_object('category_id', NEW.id, 'name', NEW.name, 'changes', _changes));
    END IF;
    RETURN NEW;
  ELSE
    PERFORM public._audit(OLD.server_id, 'category_delete', NULL,
      jsonb_build_object('category_id', OLD.id, 'name', OLD.name));
    RETURN OLD;
  END IF;
END;
$$;
DROP TRIGGER IF EXISTS audit_categories ON public.categories;
CREATE TRIGGER audit_categories AFTER INSERT OR UPDATE OR DELETE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_categories();

-- =============================================================================
-- channels INSERT/UPDATE/DELETE
-- =============================================================================
CREATE OR REPLACE FUNCTION public.trg_audit_channels()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _changes jsonb := '{}'::jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public._audit(NEW.server_id, 'channel_create', NULL,
      jsonb_build_object('channel_id', NEW.id, 'name', NEW.name, 'type', NEW.type));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.name IS DISTINCT FROM OLD.name THEN
      _changes := _changes || jsonb_build_object('name', jsonb_build_object('old', OLD.name, 'new', NEW.name));
    END IF;
    IF NEW.description IS DISTINCT FROM OLD.description THEN
      _changes := _changes || jsonb_build_object('description', jsonb_build_object('old', OLD.description, 'new', NEW.description));
    END IF;
    IF NEW.category_id IS DISTINCT FROM OLD.category_id THEN
      _changes := _changes || jsonb_build_object('category_id', jsonb_build_object('old', OLD.category_id, 'new', NEW.category_id));
    END IF;
    IF NEW.slowmode_seconds IS DISTINCT FROM OLD.slowmode_seconds THEN
      _changes := _changes || jsonb_build_object('slowmode_seconds', jsonb_build_object('old', OLD.slowmode_seconds, 'new', NEW.slowmode_seconds));
    END IF;
    IF NEW.position IS DISTINCT FROM OLD.position THEN
      _changes := _changes || jsonb_build_object('position', jsonb_build_object('old', OLD.position, 'new', NEW.position));
    END IF;
    IF _changes <> '{}'::jsonb THEN
      PERFORM public._audit(NEW.server_id, 'channel_update', NULL,
        jsonb_build_object('channel_id', NEW.id, 'name', NEW.name, 'changes', _changes));
    END IF;
    RETURN NEW;
  ELSE
    PERFORM public._audit(OLD.server_id, 'channel_delete', NULL,
      jsonb_build_object('channel_id', OLD.id, 'name', OLD.name, 'type', OLD.type));
    RETURN OLD;
  END IF;
END;
$$;
DROP TRIGGER IF EXISTS audit_channels ON public.channels;
CREATE TRIGGER audit_channels AFTER INSERT OR UPDATE OR DELETE ON public.channels
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_channels();

-- =============================================================================
-- channel_permission_overrides INSERT/UPDATE/DELETE
-- =============================================================================
CREATE OR REPLACE FUNCTION public.trg_audit_channel_overrides()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _server_id uuid; _channel_name text; _role_name text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT server_id, name INTO _server_id, _channel_name FROM channels WHERE id = OLD.channel_id;
    SELECT name INTO _role_name FROM roles WHERE id = OLD.role_id;
    PERFORM public._audit(_server_id, 'channel_overwrite_delete', NULL,
      jsonb_build_object('channel_id', OLD.channel_id, 'channel_name', _channel_name,
        'role_id', OLD.role_id, 'role_name', _role_name, 'permission', OLD.permission, 'type', OLD.type));
    RETURN OLD;
  ELSE
    SELECT server_id, name INTO _server_id, _channel_name FROM channels WHERE id = NEW.channel_id;
    SELECT name INTO _role_name FROM roles WHERE id = NEW.role_id;
    PERFORM public._audit(_server_id,
      CASE TG_OP WHEN 'INSERT' THEN 'channel_overwrite_create' ELSE 'channel_overwrite_update' END,
      NULL,
      jsonb_build_object('channel_id', NEW.channel_id, 'channel_name', _channel_name,
        'role_id', NEW.role_id, 'role_name', _role_name, 'permission', NEW.permission, 'type', NEW.type));
    RETURN NEW;
  END IF;
END;
$$;
DROP TRIGGER IF EXISTS audit_channel_overrides ON public.channel_permission_overrides;
CREATE TRIGGER audit_channel_overrides
  AFTER INSERT OR UPDATE OR DELETE ON public.channel_permission_overrides
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_channel_overrides();

-- =============================================================================
-- invites INSERT/DELETE
-- =============================================================================
CREATE OR REPLACE FUNCTION public.trg_audit_invites()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public._audit(NEW.server_id, 'invite_create', NULL,
      jsonb_build_object('code', NEW.code, 'max_uses', NEW.max_uses, 'expires_at', NEW.expires_at));
    RETURN NEW;
  ELSE
    PERFORM public._audit(OLD.server_id, 'invite_delete', NULL,
      jsonb_build_object('code', OLD.code));
    RETURN OLD;
  END IF;
END;
$$;
DROP TRIGGER IF EXISTS audit_invites ON public.invites;
CREATE TRIGGER audit_invites AFTER INSERT OR DELETE ON public.invites
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_invites();

-- =============================================================================
-- webhooks INSERT/UPDATE/DELETE
-- =============================================================================
CREATE OR REPLACE FUNCTION public.trg_audit_webhooks()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _server_id uuid; _changes jsonb := '{}'::jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT server_id INTO _server_id FROM channels WHERE id = OLD.channel_id;
    PERFORM public._audit(_server_id, 'webhook_delete', NULL,
      jsonb_build_object('webhook_id', OLD.id, 'name', OLD.name, 'channel_id', OLD.channel_id));
    RETURN OLD;
  ELSIF TG_OP = 'INSERT' THEN
    SELECT server_id INTO _server_id FROM channels WHERE id = NEW.channel_id;
    PERFORM public._audit(_server_id, 'webhook_create', NULL,
      jsonb_build_object('webhook_id', NEW.id, 'name', NEW.name, 'channel_id', NEW.channel_id));
    RETURN NEW;
  ELSE
    SELECT server_id INTO _server_id FROM channels WHERE id = NEW.channel_id;
    IF NEW.name IS DISTINCT FROM OLD.name THEN
      _changes := _changes || jsonb_build_object('name', jsonb_build_object('old', OLD.name, 'new', NEW.name));
    END IF;
    IF NEW.avatar_url IS DISTINCT FROM OLD.avatar_url THEN
      _changes := _changes || jsonb_build_object('avatar_url', jsonb_build_object('old', OLD.avatar_url, 'new', NEW.avatar_url));
    END IF;
    IF NEW.channel_id IS DISTINCT FROM OLD.channel_id THEN
      _changes := _changes || jsonb_build_object('channel_id', jsonb_build_object('old', OLD.channel_id, 'new', NEW.channel_id));
    END IF;
    IF _changes <> '{}'::jsonb THEN
      PERFORM public._audit(_server_id, 'webhook_update', NULL,
        jsonb_build_object('webhook_id', NEW.id, 'name', NEW.name, 'changes', _changes));
    END IF;
    RETURN NEW;
  END IF;
END;
$$;
DROP TRIGGER IF EXISTS audit_webhooks ON public.webhooks;
CREATE TRIGGER audit_webhooks AFTER INSERT OR UPDATE OR DELETE ON public.webhooks
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_webhooks();

-- =============================================================================
-- server_emojis INSERT/UPDATE/DELETE
-- =============================================================================
CREATE OR REPLACE FUNCTION public.trg_audit_emojis()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public._audit(NEW.server_id, 'emoji_create', NULL,
      jsonb_build_object('emoji_id', NEW.id, 'name', NEW.name));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.name IS DISTINCT FROM OLD.name THEN
      PERFORM public._audit(NEW.server_id, 'emoji_update', NULL,
        jsonb_build_object('emoji_id', NEW.id, 'changes',
          jsonb_build_object('name', jsonb_build_object('old', OLD.name, 'new', NEW.name))));
    END IF;
    RETURN NEW;
  ELSE
    PERFORM public._audit(OLD.server_id, 'emoji_delete', NULL,
      jsonb_build_object('emoji_id', OLD.id, 'name', OLD.name));
    RETURN OLD;
  END IF;
END;
$$;
DROP TRIGGER IF EXISTS audit_emojis ON public.server_emojis;
CREATE TRIGGER audit_emojis AFTER INSERT OR UPDATE OR DELETE ON public.server_emojis
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_emojis();

-- =============================================================================
-- server_stickers INSERT/UPDATE/DELETE
-- =============================================================================
CREATE OR REPLACE FUNCTION public.trg_audit_stickers()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _changes jsonb := '{}'::jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public._audit(NEW.server_id, 'sticker_create', NULL,
      jsonb_build_object('sticker_id', NEW.id, 'name', NEW.name));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.name IS DISTINCT FROM OLD.name THEN
      _changes := _changes || jsonb_build_object('name', jsonb_build_object('old', OLD.name, 'new', NEW.name));
    END IF;
    IF NEW.description IS DISTINCT FROM OLD.description THEN
      _changes := _changes || jsonb_build_object('description', jsonb_build_object('old', OLD.description, 'new', NEW.description));
    END IF;
    IF _changes <> '{}'::jsonb THEN
      PERFORM public._audit(NEW.server_id, 'sticker_update', NULL,
        jsonb_build_object('sticker_id', NEW.id, 'name', NEW.name, 'changes', _changes));
    END IF;
    RETURN NEW;
  ELSE
    PERFORM public._audit(OLD.server_id, 'sticker_delete', NULL,
      jsonb_build_object('sticker_id', OLD.id, 'name', OLD.name));
    RETURN OLD;
  END IF;
END;
$$;
DROP TRIGGER IF EXISTS audit_stickers ON public.server_stickers;
CREATE TRIGGER audit_stickers AFTER INSERT OR UPDATE OR DELETE ON public.server_stickers
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_stickers();

-- =============================================================================
-- messages DELETE → message_delete (only if actor != author)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.trg_audit_message_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _server_id uuid; _channel_name text;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() = OLD.author_id THEN
    RETURN OLD;
  END IF;
  SELECT server_id, name INTO _server_id, _channel_name FROM channels WHERE id = OLD.channel_id;
  PERFORM public._audit(_server_id, 'message_delete', OLD.author_id,
    jsonb_build_object('channel_id', OLD.channel_id, 'channel_name', _channel_name,
      'message_id', OLD.id, 'content_preview', LEFT(COALESCE(OLD.content, ''), 100)));
  RETURN OLD;
END;
$$;
DROP TRIGGER IF EXISTS audit_message_delete ON public.messages;
CREATE TRIGGER audit_message_delete AFTER DELETE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_message_delete();

-- =============================================================================
-- pinned_messages INSERT/DELETE
-- =============================================================================
CREATE OR REPLACE FUNCTION public.trg_audit_pins()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _server_id uuid; _channel_name text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT server_id, name INTO _server_id, _channel_name FROM channels WHERE id = NEW.channel_id;
    PERFORM public._audit(_server_id, 'message_pin', NULL,
      jsonb_build_object('channel_id', NEW.channel_id, 'channel_name', _channel_name, 'message_id', NEW.message_id));
    RETURN NEW;
  ELSE
    SELECT server_id, name INTO _server_id, _channel_name FROM channels WHERE id = OLD.channel_id;
    PERFORM public._audit(_server_id, 'message_unpin', NULL,
      jsonb_build_object('channel_id', OLD.channel_id, 'channel_name', _channel_name, 'message_id', OLD.message_id));
    RETURN OLD;
  END IF;
END;
$$;
DROP TRIGGER IF EXISTS audit_pins ON public.pinned_messages;
CREATE TRIGGER audit_pins AFTER INSERT OR DELETE ON public.pinned_messages
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_pins();

-- =============================================================================
-- threads INSERT/DELETE
-- =============================================================================
CREATE OR REPLACE FUNCTION public.trg_audit_threads()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _server_id uuid; _channel_name text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT server_id, name INTO _server_id, _channel_name FROM channels WHERE id = NEW.channel_id;
    PERFORM public._audit(_server_id, 'thread_create', NULL,
      jsonb_build_object('thread_id', NEW.id, 'name', NEW.name,
        'channel_id', NEW.channel_id, 'channel_name', _channel_name));
    RETURN NEW;
  ELSE
    SELECT server_id, name INTO _server_id, _channel_name FROM channels WHERE id = OLD.channel_id;
    PERFORM public._audit(_server_id, 'thread_delete', NULL,
      jsonb_build_object('thread_id', OLD.id, 'name', OLD.name,
        'channel_id', OLD.channel_id, 'channel_name', _channel_name));
    RETURN OLD;
  END IF;
END;
$$;
DROP TRIGGER IF EXISTS audit_threads ON public.threads;
CREATE TRIGGER audit_threads AFTER INSERT OR DELETE ON public.threads
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_threads();
