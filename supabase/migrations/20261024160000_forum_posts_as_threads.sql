-- Posts de Forum et de salon Multimedia = fils (threads) du salon, comme
-- Discord : le premier message du fil est le message d'ouverture du post,
-- les reponses sont les messages du fil (pieces jointes, reactions, abonnes
-- et etats de lecture deja geres par thread_messages / thread_followers).
--
-- Les anciennes tables forum_posts / media_posts sont vides en production et
-- ne sont plus utilisees par l'interface.

-- ---------------------------------------------------------------------------
-- 1. Etat d'un post sur le fil
-- ---------------------------------------------------------------------------
ALTER TABLE public.threads
  ADD COLUMN IF NOT EXISTS applied_tags uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS slowmode_seconds integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS auto_archive_minutes integer,
  ADD COLUMN IF NOT EXISTS spoiler boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS thumbnail_url text,
  ADD COLUMN IF NOT EXISTS message_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS starter_message_id uuid REFERENCES public.thread_messages(id) ON DELETE SET NULL;

ALTER TABLE public.threads DROP CONSTRAINT IF EXISTS threads_slowmode_range;
ALTER TABLE public.threads ADD CONSTRAINT threads_slowmode_range CHECK (slowmode_seconds BETWEEN 0 AND 21600);

CREATE INDEX IF NOT EXISTS threads_channel_activity_idx ON public.threads (channel_id, pinned DESC, last_message_at DESC);

-- Nombre de messages du fil (le message d'ouverture compris).
UPDATE public.threads t SET message_count = (SELECT count(*) FROM public.thread_messages m WHERE m.thread_id = t.id);

CREATE OR REPLACE FUNCTION public.thread_message_count_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.threads SET message_count = message_count + 1 WHERE id = NEW.thread_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.threads SET message_count = greatest(message_count - 1, 0) WHERE id = OLD.thread_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS thread_message_count_trigger ON public.thread_messages;
CREATE TRIGGER thread_message_count_trigger
  AFTER INSERT OR DELETE ON public.thread_messages
  FOR EACH ROW EXECUTE FUNCTION public.thread_message_count_sync();

-- ---------------------------------------------------------------------------
-- 2. Reglages du salon (Vue d'ensemble d'un Forum / Multimedia)
-- ---------------------------------------------------------------------------
ALTER TABLE public.forum_channel_config
  ADD COLUMN IF NOT EXISTS guidelines text,
  ADD COLUMN IF NOT EXISTS post_slowmode_seconds integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS message_slowmode_seconds integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS content_visibility text NOT NULL DEFAULT 'default';

ALTER TABLE public.forum_channel_config DROP CONSTRAINT IF EXISTS forum_channel_config_visibility_check;
ALTER TABLE public.forum_channel_config ADD CONSTRAINT forum_channel_config_visibility_check
  CHECK (content_visibility IN ('default', 'spoiler', 'age_restricted'));
ALTER TABLE public.forum_channel_config DROP CONSTRAINT IF EXISTS forum_channel_config_guidelines_length;
ALTER TABLE public.forum_channel_config ADD CONSTRAINT forum_channel_config_guidelines_length
  CHECK (guidelines IS NULL OR char_length(guidelines) <= 4096);

-- ---------------------------------------------------------------------------
-- 3. Creation d'un post : fil + message d'ouverture + abonnement, en une fois
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_forum_post(
  _channel_id uuid,
  _title text,
  _content text,
  _attachments jsonb DEFAULT '[]'::jsonb,
  _applied_tags uuid[] DEFAULT '{}',
  _thumbnail_url text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _ch public.channels%ROWTYPE;
  _cfg public.forum_channel_config%ROWTYPE;
  _tags uuid[] := coalesce(_applied_tags, '{}');
  _is_mod boolean;
  _thread_id uuid;
  _msg_id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

  SELECT * INTO _ch FROM public.channels WHERE id = _channel_id;
  IF NOT FOUND OR _ch.type::text NOT IN ('forum', 'media') THEN RAISE EXCEPTION 'NOT_A_FORUM'; END IF;

  IF NOT has_channel_permission(_uid, _channel_id, 'view_channel')
     OR NOT has_channel_permission(_uid, _channel_id, 'send_messages') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  _title := btrim(coalesce(_title, ''));
  IF char_length(_title) = 0 OR char_length(_title) > 100 THEN RAISE EXCEPTION 'INVALID_TITLE'; END IF;
  IF char_length(coalesce(_content, '')) > 4000 THEN RAISE EXCEPTION 'CONTENT_TOO_LONG'; END IF;

  _attachments := coalesce(_attachments, '[]'::jsonb);
  IF jsonb_typeof(_attachments) <> 'array' THEN RAISE EXCEPTION 'INVALID_ATTACHMENTS'; END IF;
  IF _ch.type::text = 'media' AND jsonb_array_length(_attachments) = 0 THEN RAISE EXCEPTION 'MEDIA_REQUIRED'; END IF;
  IF _ch.type::text = 'forum' AND char_length(btrim(coalesce(_content, ''))) = 0 AND jsonb_array_length(_attachments) = 0 THEN
    RAISE EXCEPTION 'CONTENT_REQUIRED';
  END IF;

  SELECT * INTO _cfg FROM public.forum_channel_config WHERE channel_id = _channel_id;
  _is_mod := has_channel_permission(_uid, _channel_id, 'manage_threads')
          OR has_channel_permission(_uid, _channel_id, 'manage_forum_tags')
          OR has_channel_permission(_uid, _channel_id, 'manage_channels');

  -- Tags : appartiennent au salon, 5 maximum, tags moderes reserves.
  IF cardinality(_tags) > 5 THEN RAISE EXCEPTION 'TOO_MANY_TAGS'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(_tags) t(id) WHERE NOT EXISTS (SELECT 1 FROM public.forum_tags f WHERE f.id = t.id AND f.channel_id = _channel_id)) THEN
    RAISE EXCEPTION 'UNKNOWN_TAG';
  END IF;
  IF NOT _is_mod AND EXISTS (SELECT 1 FROM public.forum_tags f WHERE f.id = ANY(_tags) AND f.moderated) THEN
    RAISE EXCEPTION 'MODERATED_TAG';
  END IF;
  IF coalesce(_cfg.require_tag, false) AND cardinality(_tags) = 0 THEN RAISE EXCEPTION 'TAG_REQUIRED'; END IF;

  -- Mode lent des posts.
  IF coalesce(_cfg.post_slowmode_seconds, 0) > 0 AND NOT _is_mod AND EXISTS (
    SELECT 1 FROM public.threads
    WHERE channel_id = _channel_id AND created_by = _uid
      AND created_at > now() - make_interval(secs => _cfg.post_slowmode_seconds)
  ) THEN
    RAISE EXCEPTION 'SLOWMODE';
  END IF;

  INSERT INTO public.threads (channel_id, name, created_by, applied_tags, thumbnail_url, auto_archive_minutes, slowmode_seconds, spoiler, last_message_at)
  VALUES (
    _channel_id, _title, _uid, _tags, _thumbnail_url,
    coalesce(_cfg.default_auto_archive_duration, 4320),
    coalesce(_cfg.message_slowmode_seconds, 0),
    coalesce(_cfg.content_visibility, 'default') = 'spoiler',
    now()
  )
  RETURNING id INTO _thread_id;

  INSERT INTO public.thread_messages (thread_id, author_id, content, attachments)
  VALUES (_thread_id, _uid, coalesce(_content, ''), _attachments)
  RETURNING id INTO _msg_id;

  UPDATE public.threads SET starter_message_id = _msg_id WHERE id = _thread_id;

  INSERT INTO public.thread_followers (thread_id, user_id) VALUES (_thread_id, _uid)
  ON CONFLICT DO NOTHING;

  RETURN _thread_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_forum_post(uuid, text, text, jsonb, uuid[], text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.create_forum_post(uuid, text, text, jsonb, uuid[], text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. L'auteur d'un post peut le renommer, changer ses tags, le fermer
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Forum post authors can update their posts" ON public.threads;
CREATE POLICY "Forum post authors can update their posts" ON public.threads
  FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    AND EXISTS (SELECT 1 FROM public.channels c WHERE c.id = threads.channel_id AND c.type::text IN ('forum', 'media'))
  );

CREATE OR REPLACE FUNCTION public.forum_thread_update_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RETURN NEW; END IF;
  IF has_channel_permission(_uid, NEW.channel_id, 'manage_threads')
     OR has_channel_permission(_uid, NEW.channel_id, 'manage_messages') THEN
    RETURN NEW;
  END IF;
  -- Auteur sans droit de moderation : epingler, verrouiller et le mode lent
  -- restent reserves aux moderateurs.
  IF NEW.pinned IS DISTINCT FROM OLD.pinned
     OR NEW.locked IS DISTINCT FROM OLD.locked
     OR NEW.slowmode_seconds IS DISTINCT FROM OLD.slowmode_seconds
     OR NEW.channel_id IS DISTINCT FROM OLD.channel_id
     OR NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF cardinality(NEW.applied_tags) > 5 THEN RAISE EXCEPTION 'TOO_MANY_TAGS'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.forum_tags f
    WHERE f.moderated AND (f.id = ANY(NEW.applied_tags)) <> (f.id = ANY(OLD.applied_tags))
  ) THEN
    RAISE EXCEPTION 'MODERATED_TAG';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS forum_thread_update_guard_trigger ON public.threads;
CREATE TRIGGER forum_thread_update_guard_trigger
  BEFORE UPDATE ON public.threads
  FOR EACH ROW EXECUTE FUNCTION public.forum_thread_update_guard();

-- ---------------------------------------------------------------------------
-- 5. Messages d'un fil : verrou, mode lent, reouverture d'un post ferme
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.thread_message_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _t public.threads%ROWTYPE;
  _mod boolean;
BEGIN
  SELECT * INTO _t FROM public.threads WHERE id = NEW.thread_id;
  IF NOT FOUND THEN RETURN NEW; END IF;
  -- Message d'ouverture insere par create_forum_post.
  IF _t.starter_message_id IS NULL AND _t.message_count = 0 THEN RETURN NEW; END IF;

  _mod := has_channel_permission(NEW.author_id, _t.channel_id, 'manage_threads')
       OR has_channel_permission(NEW.author_id, _t.channel_id, 'manage_messages');
  IF _mod THEN RETURN NEW; END IF;

  IF _t.locked THEN RAISE EXCEPTION 'THREAD_LOCKED'; END IF;
  IF _t.slowmode_seconds > 0 AND EXISTS (
    SELECT 1 FROM public.thread_messages
    WHERE thread_id = NEW.thread_id AND author_id = NEW.author_id
      AND created_at > now() - make_interval(secs => _t.slowmode_seconds)
  ) THEN
    RAISE EXCEPTION 'SLOWMODE';
  END IF;
  -- Ecrire dans un post ferme le rouvre (comportement de Discord).
  IF _t.archived THEN
    UPDATE public.threads SET archived = false, archived_at = NULL WHERE id = _t.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS thread_message_guard_trigger ON public.thread_messages;
CREATE TRIGGER thread_message_guard_trigger
  BEFORE INSERT ON public.thread_messages
  FOR EACH ROW EXECUTE FUNCTION public.thread_message_guard();

-- ---------------------------------------------------------------------------
-- 6. L'auteur d'un post peut le supprimer (menu "Supprimer le post")
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Forum post authors can delete their posts" ON public.threads;
CREATE POLICY "Forum post authors can delete their posts" ON public.threads
  FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    AND EXISTS (SELECT 1 FROM public.channels c WHERE c.id = threads.channel_id AND c.type::text IN ('forum', 'media'))
  );
