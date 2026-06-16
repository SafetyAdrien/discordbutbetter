
-- 1. Helper: resolve whether the current auth.uid() may subscribe to a Realtime topic.
CREATE OR REPLACE FUNCTION public.can_access_realtime_topic(_topic text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _id uuid;
  _id2 uuid;
  _uuid_match text[];
BEGIN
  IF _uid IS NULL OR _topic IS NULL OR _topic = '' THEN
    RETURN false;
  END IF;

  -- Extract the first UUID present in the topic (most topics follow `<prefix><uuid>` or `<prefix><uuid><suffix>`)
  _uuid_match := regexp_match(_topic, '([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})');
  IF _uuid_match IS NOT NULL THEN
    BEGIN
      _id := _uuid_match[1]::uuid;
    EXCEPTION WHEN others THEN
      _id := NULL;
    END;
  END IF;

  -- ===== Server-scoped topics =====
  IF _topic LIKE 'audit-logs:%'
     OR _topic LIKE 'server-settings-rt-%'
     OR _topic LIKE 'invites-rt-%'
     OR _topic LIKE 'srv-voice:%' THEN
    RETURN _id IS NOT NULL AND public.is_server_member(_uid, _id);
  END IF;

  -- ===== Channel-scoped topics (voice signaling + webhooks) =====
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

  -- ===== DM conversation-scoped topics =====
  IF _topic LIKE 'dm-messages:%'
     OR _topic LIKE 'dm-calls:%'
     OR _topic LIKE 'dm-pinned-rt-%' THEN
    RETURN _id IS NOT NULL AND public.is_dm_participant(_uid, _id);
  END IF;

  -- DM call signaling / state — second UUID is dm_calls.id
  IF _topic LIKE 'dm-call-signals:%' OR _topic LIKE 'dm-call-state:%' THEN
    RETURN _id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.dm_calls dc
      WHERE dc.id = _id AND public.is_dm_participant(_uid, dc.conversation_id)
    );
  END IF;

  -- DM reactions — UUID is dm_messages.id
  IF _topic LIKE 'dm-reactions-rt-%' THEN
    RETURN _id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.dm_messages m
      WHERE m.id = _id AND public.is_dm_participant(_uid, m.conversation_id)
    );
  END IF;

  -- ===== User-scoped topics =====
  IF _topic LIKE 'profile:%'
     OR _topic LIKE 'friendships:%'
     OR _topic LIKE 'friend-favorites:%'
     OR _topic LIKE 'dm-updates:%' THEN
    RETURN _id IS NOT NULL AND _id = _uid;
  END IF;

  -- Unknown private topic → deny (fail closed)
  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.can_access_realtime_topic(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_realtime_topic(text) TO authenticated, service_role;

-- 2. Topic-level RLS on realtime.messages (applies to channels opened with { config: { private: true }})
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rt_topic_subscribe_authorized" ON realtime.messages;
CREATE POLICY "rt_topic_subscribe_authorized"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (public.can_access_realtime_topic((SELECT realtime.topic())));

DROP POLICY IF EXISTS "rt_topic_send_authorized" ON realtime.messages;
CREATE POLICY "rt_topic_send_authorized"
  ON realtime.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_access_realtime_topic((SELECT realtime.topic())));
