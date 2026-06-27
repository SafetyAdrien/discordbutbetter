-- 1) Extend can_access_realtime_topic with watch-together branch
CREATE OR REPLACE FUNCTION public.can_access_realtime_topic(_topic text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _id uuid;
  _id2 uuid;
  _uuid_match text[];
BEGIN
  IF _uid IS NULL OR _topic IS NULL OR _topic = '' THEN
    RETURN false;
  END IF;

  _uuid_match := regexp_match(_topic, '([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})');
  IF _uuid_match IS NOT NULL THEN
    BEGIN
      _id := _uuid_match[1]::uuid;
    EXCEPTION WHEN others THEN
      _id := NULL;
    END;
  END IF;

  IF _topic LIKE 'audit-logs:%'
     OR _topic LIKE 'server-settings-rt-%'
     OR _topic LIKE 'invites-rt-%'
     OR _topic LIKE 'srv-voice:%' THEN
    RETURN _id IS NOT NULL AND public.is_server_member(_uid, _id);
  END IF;

  IF _topic LIKE 'voice-signals-%'
     OR _topic LIKE 'voice-p:%'
     OR _topic LIKE 'voice-events:%'
     OR _topic LIKE 'voice-participants-%' THEN
    RETURN _id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.channels c
      WHERE c.id = _id AND public.is_server_member(_uid, c.server_id)
    );
  END IF;

  IF _topic LIKE 'webhooks-rt-%' THEN
    RETURN _id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.channels c
      WHERE c.id = _id
        AND public.has_server_permission(_uid, c.server_id, 'manage_channels'::server_permission)
    );
  END IF;

  IF _topic LIKE 'dm-messages:%'
     OR _topic LIKE 'dm-calls:%'
     OR _topic LIKE 'dm-pinned-rt-%' THEN
    RETURN _id IS NOT NULL AND public.is_dm_participant(_uid, _id);
  END IF;

  IF _topic LIKE 'dm-call-signals:%' OR _topic LIKE 'dm-call-state:%' THEN
    RETURN _id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.dm_calls dc
      WHERE dc.id = _id AND public.is_dm_participant(_uid, dc.conversation_id)
    );
  END IF;

  IF _topic LIKE 'dm-reactions-rt-%' THEN
    RETURN _id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.dm_messages m
      WHERE m.id = _id AND public.is_dm_participant(_uid, m.conversation_id)
    );
  END IF;

  IF _topic LIKE 'profile:%'
     OR _topic LIKE 'friendships:%'
     OR _topic LIKE 'friend-favorites:%'
     OR _topic LIKE 'dm-updates:%' THEN
    RETURN _id IS NOT NULL AND _id = _uid;
  END IF;

  -- Watch Together: subscriber must be server member of parent channel OR DM participant
  IF _topic LIKE 'watch-together:%' THEN
    IF _id IS NULL THEN
      RETURN false;
    END IF;
    RETURN EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.channels c ON c.id = m.channel_id
      WHERE m.id = _id AND public.is_server_member(_uid, c.server_id)
    ) OR EXISTS (
      SELECT 1 FROM public.dm_messages dm
      WHERE dm.id = _id AND public.is_dm_participant(_uid, dm.conversation_id)
    );
  END IF;

  RETURN false;
END;
$function$;

-- 2) New host-only publish gate for watch-together topics
CREATE OR REPLACE FUNCTION public.can_host_watch_together_topic(_topic text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _id uuid;
  _uuid_match text[];
BEGIN
  IF _uid IS NULL OR _topic IS NULL OR _topic NOT LIKE 'watch-together:%' THEN
    RETURN false;
  END IF;

  _uuid_match := regexp_match(_topic, '([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})');
  IF _uuid_match IS NULL THEN
    RETURN false;
  END IF;
  BEGIN
    _id := _uuid_match[1]::uuid;
  EXCEPTION WHEN others THEN
    RETURN false;
  END;

  RETURN EXISTS (
    SELECT 1 FROM public.messages m WHERE m.id = _id AND m.author_id = _uid
  ) OR EXISTS (
    SELECT 1 FROM public.dm_messages dm WHERE dm.id = _id AND dm.author_id = _uid
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.can_host_watch_together_topic(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_host_watch_together_topic(text) TO authenticated;

-- 3) Recreate rt_topic_send_authorized to enforce host-only broadcast for watch-together
DROP POLICY IF EXISTS rt_topic_send_authorized ON realtime.messages;

CREATE POLICY rt_topic_send_authorized
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  CASE
    WHEN (SELECT realtime.topic()) LIKE 'watch-together:%' THEN
      CASE
        WHEN realtime.messages.extension = 'broadcast'
          THEN public.can_host_watch_together_topic((SELECT realtime.topic()))
        ELSE public.can_access_realtime_topic((SELECT realtime.topic()))
      END
    ELSE public.can_access_realtime_topic((SELECT realtime.topic()))
  END
);