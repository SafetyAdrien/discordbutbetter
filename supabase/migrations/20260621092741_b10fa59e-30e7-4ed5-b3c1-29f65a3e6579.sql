CREATE OR REPLACE FUNCTION public.uuid_to_snowflake(_id uuid)
RETURNS text
LANGUAGE sql
IMMUTABLE
STRICT
SET search_path TO 'public'
AS $$
  SELECT lpad((('x' || substr(replace(_id::text, '-', ''), 1, 15))::bit(60)::bigint)::text, 18, '0')::text;
$$;

CREATE INDEX IF NOT EXISTS idx_profiles_uuid_to_snowflake
  ON public.profiles (public.uuid_to_snowflake(id));

CREATE OR REPLACE FUNCTION public.detect_and_insert_mentions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  IF NEW.author_id IS NULL OR COALESCE(NEW.content, '') = '' THEN
    RETURN NEW;
  END IF;

  _author_id := NEW.author_id;

  SELECT server_id INTO _server_id
  FROM public.channels
  WHERE id = NEW.channel_id;

  IF _server_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- User mentions: <@uuid> and Discord-style <@!uuid>
  FOR _user_match IN
    SELECT DISTINCT (regexp_matches(NEW.content, '<@!?([0-9a-fA-F-]{36})>', 'g'))[1]
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
      SELECT 1
      FROM public.server_members
      WHERE server_id = _server_id
        AND user_id = _mention_user_id
    ) THEN
      INSERT INTO public.channel_mentions (channel_id, user_id, message_id)
      VALUES (NEW.channel_id, _mention_user_id, NEW.id)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  -- User mentions: <@18-digit-snowflake> and <@!18-digit-snowflake>
  FOR _user_match IN
    SELECT DISTINCT (regexp_matches(NEW.content, '<@!?(\d{18})>', 'g'))[1]
  LOOP
    SELECT p.id INTO _mention_user_id
    FROM public.profiles p
    WHERE public.uuid_to_snowflake(p.id) = _user_match
    LIMIT 1;

    IF _mention_user_id IS NULL OR _mention_user_id = _author_id THEN
      CONTINUE;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.server_members
      WHERE server_id = _server_id
        AND user_id = _mention_user_id
    ) THEN
      INSERT INTO public.channel_mentions (channel_id, user_id, message_id)
      VALUES (NEW.channel_id, _mention_user_id, NEW.id)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  -- @everyone / @here
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

ALTER TABLE public.channel_mentions REPLICA IDENTITY FULL;
ALTER TABLE public.dm_read_states REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_read_states;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;