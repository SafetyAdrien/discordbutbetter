-- Sondages : clôture avec confirmation + message système idempotent
-- (clôture manuelle et expiration naturelle passent par la même RPC,
-- qui insère elle-même le message système "Le sondage X est clos" au
-- plus une seule fois par sondage, grâce à un UPDATE conditionnel
-- atomique sur closed_notified).

-- 1. Colonne d'idempotence sur les deux familles de sondages.
ALTER TABLE public.polls
  ADD COLUMN IF NOT EXISTS closed_notified boolean NOT NULL DEFAULT false;

ALTER TABLE public.dm_polls
  ADD COLUMN IF NOT EXISTS closed_notified boolean NOT NULL DEFAULT false;

-- 2. RPC channel/thread : clôture (si besoin) + insertion idempotente du
--    message système dans le SALON PARENT. polls.channel_id est toujours
--    renseigné (même pour un sondage posté dans un thread, cf.
--    useCreatePoll qui insère channel_id + thread_id ensemble), et la
--    table messages n'a de toute façon pas de colonne thread_id (les
--    messages de threads vivent dans thread_messages, qui n'a pas de
--    is_system) donc un sondage clos dans un thread notifie dans son
--    salon parent directement via polls.channel_id.
CREATE OR REPLACE FUNCTION public.close_poll_and_claim_notification(
  _poll_id uuid,
  _manual boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _poll record;
  _claimed boolean;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO _poll FROM public.polls WHERE polls.id = _poll_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF _manual AND _poll.author_id IS DISTINCT FROM _uid THEN
    RAISE EXCEPTION 'Only the poll author can close this poll';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.channels c
    WHERE c.id = _poll.channel_id
      AND public.has_channel_permission(_uid, c.id, 'view_channel'::server_permission)
  ) THEN
    RAISE EXCEPTION 'Not allowed to view this channel';
  END IF;

  IF _poll.expires_at IS NULL OR _poll.expires_at > now() THEN
    UPDATE public.polls SET expires_at = now() WHERE polls.id = _poll_id;
  END IF;

  UPDATE public.polls
  SET closed_notified = true
  WHERE polls.id = _poll_id AND polls.closed_notified = false
  RETURNING true INTO _claimed;

  IF _claimed THEN
    INSERT INTO public.messages (channel_id, author_id, content, is_system)
    VALUES (
      _poll.channel_id,
      _poll.author_id,
      '[SYSTEM:POLL_CLOSED:' || _poll_id::text || ']',
      true
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.close_poll_and_claim_notification(uuid, boolean) TO authenticated;

-- 3. Équivalent DM : étend le CHECK existant sur dm_messages.system_type
--    (nom de contrainte résolu dynamiquement, auto-généré par Postgres à
--    la création de la colonne dans 20260626201338_...sql) et réutilise
--    le pattern report_screen_capture / guard_dm_messages_system_type.
DO $$
DECLARE
  _constraint_name text;
BEGIN
  SELECT con.conname INTO _constraint_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname = 'dm_messages'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) ILIKE '%system_type%';

  IF _constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.dm_messages DROP CONSTRAINT %I', _constraint_name);
  END IF;
END $$;

ALTER TABLE public.dm_messages
  ADD CONSTRAINT dm_messages_system_type_check
  CHECK (system_type IS NULL OR system_type IN (
    'screenshot','screen_recording_start','screen_recording_stop','poll_closed'
  ));

-- Colonne pour retrouver le dm_poll clos référencé par un message système
-- (les autres system_type n'en ont pas besoin).
ALTER TABLE public.dm_messages
  ADD COLUMN IF NOT EXISTS system_poll_id uuid NULL REFERENCES public.dm_polls(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.close_dm_poll_and_notify(
  _poll_id uuid,
  _manual boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _poll record;
  _claimed boolean;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO _poll FROM public.dm_polls WHERE dm_polls.id = _poll_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF _manual AND _poll.author_id IS DISTINCT FROM _uid THEN
    RAISE EXCEPTION 'Only the poll author can close this poll';
  END IF;

  IF NOT public.is_dm_participant(_uid, _poll.conversation_id) THEN
    RAISE EXCEPTION 'Not a participant of this conversation';
  END IF;

  IF _poll.expires_at IS NULL OR _poll.expires_at > now() THEN
    UPDATE public.dm_polls SET expires_at = now() WHERE dm_polls.id = _poll_id;
  END IF;

  UPDATE public.dm_polls
  SET closed_notified = true
  WHERE dm_polls.id = _poll_id AND dm_polls.closed_notified = false
  RETURNING true INTO _claimed;

  IF _claimed THEN
    PERFORM set_config('app.allow_system_type', '1', true);
    INSERT INTO public.dm_messages (conversation_id, author_id, content, system_type, system_poll_id, attachments)
    VALUES (_poll.conversation_id, _poll.author_id, '', 'poll_closed', _poll_id, '[]'::jsonb);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.close_dm_poll_and_notify(uuid, boolean) TO authenticated;
