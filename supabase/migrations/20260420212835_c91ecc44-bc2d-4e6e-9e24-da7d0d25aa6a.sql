-- Function: can the user mention @everyone/@here in this server?
CREATE OR REPLACE FUNCTION public.can_mention_everyone(_user_id uuid, _server_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_owner boolean;
  _has_perm boolean;
BEGIN
  IF _user_id IS NULL OR _server_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT (s.owner_id = _user_id OR s.secondary_owner_id = _user_id)
    INTO _is_owner
  FROM public.servers s
  WHERE s.id = _server_id;

  IF COALESCE(_is_owner, false) THEN
    RETURN true;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.server_members sm
    JOIN public.member_roles mr ON mr.member_id = sm.id
    JOIN public.roles r ON r.id = mr.role_id
    WHERE sm.user_id = _user_id
      AND sm.server_id = _server_id
      AND (
        'administrator'::server_permission = ANY(r.permissions)
        OR 'mention_everyone'::server_permission = ANY(r.permissions)
      )
  ) INTO _has_perm;

  RETURN COALESCE(_has_perm, false);
END;
$$;

-- Refonte du trigger detect_and_insert_mentions
CREATE OR REPLACE FUNCTION public.detect_and_insert_mentions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _server_id uuid;
  _author_id uuid;
  _has_everyone boolean;
  _has_here boolean;
  _can_mention boolean;
  _mention_user_id uuid;
  _user_match text;
BEGIN
  IF NEW.author_id IS NULL THEN
    RETURN NEW;
  END IF;

  _author_id := NEW.author_id;

  SELECT server_id INTO _server_id
  FROM public.channels
  WHERE id = NEW.channel_id;

  IF _server_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- 1) User mentions <@uuid>
  FOR _user_match IN
    SELECT DISTINCT (regexp_matches(NEW.content, '<@([0-9a-fA-F-]{36})>', 'g'))[1]
  LOOP
    BEGIN
      _mention_user_id := _user_match::uuid;
    EXCEPTION WHEN others THEN
      CONTINUE;
    END;

    IF _mention_user_id = _author_id THEN
      CONTINUE;
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.server_members
      WHERE server_id = _server_id AND user_id = _mention_user_id
    ) THEN
      INSERT INTO public.channel_mentions (channel_id, user_id, message_id)
      VALUES (NEW.channel_id, _mention_user_id, NEW.id)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  -- 2) @everyone / @here
  _has_everyone := NEW.content ~ '\m@everyone\M';
  _has_here := NEW.content ~ '\m@here\M';

  IF _has_everyone OR _has_here THEN
    _can_mention := public.can_mention_everyone(_author_id, _server_id);

    IF _can_mention THEN
      IF _has_everyone THEN
        INSERT INTO public.channel_mentions (channel_id, user_id, message_id)
        SELECT NEW.channel_id, sm.user_id, NEW.id
        FROM public.server_members sm
        WHERE sm.server_id = _server_id
          AND sm.user_id <> _author_id
        ON CONFLICT DO NOTHING;
      ELSIF _has_here THEN
        INSERT INTO public.channel_mentions (channel_id, user_id, message_id)
        SELECT NEW.channel_id, sm.user_id, NEW.id
        FROM public.server_members sm
        JOIN public.profiles p ON p.id = sm.user_id
        WHERE sm.server_id = _server_id
          AND sm.user_id <> _author_id
          AND p.status IN ('online', 'idle', 'dnd')
        ON CONFLICT DO NOTHING;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;