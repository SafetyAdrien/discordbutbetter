
-- 1. download_permissions table
CREATE TABLE public.download_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  allowed_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, allowed_user_id),
  CHECK (owner_id <> allowed_user_id)
);

GRANT SELECT, INSERT, DELETE ON public.download_permissions TO authenticated;
GRANT ALL ON public.download_permissions TO service_role;

ALTER TABLE public.download_permissions ENABLE ROW LEVEL SECURITY;

-- Owner can see their own grants; the allowed user can see the rows that
-- target them (required so the realtime payload reaches their session).
CREATE POLICY "download_permissions_select_self_or_allowed"
ON public.download_permissions FOR SELECT
TO authenticated
USING (owner_id = auth.uid() OR allowed_user_id = auth.uid());

CREATE POLICY "download_permissions_insert_own"
ON public.download_permissions FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "download_permissions_delete_own"
ON public.download_permissions FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

CREATE INDEX idx_download_permissions_allowed_user ON public.download_permissions(allowed_user_id);
CREATE INDEX idx_download_permissions_owner ON public.download_permissions(owner_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.download_permissions;

-- 2. can_download_user_content RPC
CREATE OR REPLACE FUNCTION public.can_download_user_content(_owner_id uuid, _viewer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    _owner_id = _viewer_id
    OR EXISTS (
      SELECT 1 FROM public.download_permissions
      WHERE owner_id = _owner_id AND allowed_user_id = _viewer_id
    );
$$;

GRANT EXECUTE ON FUNCTION public.can_download_user_content(uuid, uuid) TO authenticated;

-- 3. search_downloadable_candidates RPC
CREATE OR REPLACE FUNCTION public.search_downloadable_candidates(_query text)
RETURNS TABLE(id uuid, username text, display_name text, avatar_url text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _q text := lower(coalesce(trim(_query), ''));
BEGIN
  IF _uid IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH friends AS (
    SELECT CASE WHEN f.user_id = _uid THEN f.friend_id ELSE f.user_id END AS uid
    FROM public.friendships f
    WHERE f.status = 'accepted'
      AND (f.user_id = _uid OR f.friend_id = _uid)
  ),
  common_server_members AS (
    SELECT DISTINCT sm2.user_id AS uid
    FROM public.server_members sm1
    JOIN public.server_members sm2 ON sm2.server_id = sm1.server_id
    WHERE sm1.user_id = _uid AND sm2.user_id <> _uid
  ),
  candidates AS (
    SELECT uid FROM friends
    UNION
    SELECT uid FROM common_server_members
  )
  SELECT p.id, p.username, p.display_name, p.avatar_url
  FROM candidates c
  JOIN public.profiles p ON p.id = c.uid
  WHERE c.uid <> _uid
    AND NOT EXISTS (
      SELECT 1 FROM public.download_permissions dp
      WHERE dp.owner_id = _uid AND dp.allowed_user_id = c.uid
    )
    AND (
      _q = ''
      OR lower(p.username) LIKE '%' || _q || '%'
      OR lower(coalesce(p.display_name, '')) LIKE '%' || _q || '%'
    )
  ORDER BY p.username
  LIMIT 30;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_downloadable_candidates(text) TO authenticated;

-- 4. notify_screenshot_capture toggle on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notify_screenshot_capture boolean NOT NULL DEFAULT true;

-- 5. system_type column on dm_messages
ALTER TABLE public.dm_messages
  ADD COLUMN IF NOT EXISTS system_type text NULL
  CHECK (system_type IS NULL OR system_type IN ('screenshot','screen_recording_start','screen_recording_stop'));

-- 6. Trigger preventing direct INSERT/UPDATE that sets system_type
-- Only the SECURITY DEFINER RPC may set it (it flips app.allow_system_type='1').
CREATE OR REPLACE FUNCTION public.guard_dm_messages_system_type()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _allowed text;
BEGIN
  IF NEW.system_type IS NULL THEN
    RETURN NEW;
  END IF;

  BEGIN
    _allowed := current_setting('app.allow_system_type', true);
  EXCEPTION WHEN others THEN
    _allowed := NULL;
  END;

  IF _allowed = '1' THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'system_type can only be set by report_screen_capture RPC';
END;
$$;

DROP TRIGGER IF EXISTS dm_messages_guard_system_type ON public.dm_messages;
CREATE TRIGGER dm_messages_guard_system_type
BEFORE INSERT OR UPDATE OF system_type ON public.dm_messages
FOR EACH ROW
EXECUTE FUNCTION public.guard_dm_messages_system_type();

-- 7. report_screen_capture RPC
CREATE OR REPLACE FUNCTION public.report_screen_capture(_conversation_id uuid, _event text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _notify boolean;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _event NOT IN ('screenshot','screen_recording_start','screen_recording_stop') THEN
    RAISE EXCEPTION 'Invalid event type';
  END IF;

  IF NOT public.is_dm_participant(_uid, _conversation_id) THEN
    RAISE EXCEPTION 'Not a participant of this conversation';
  END IF;

  SELECT notify_screenshot_capture INTO _notify FROM public.profiles WHERE id = _uid;
  IF NOT COALESCE(_notify, true) THEN
    RETURN;
  END IF;

  PERFORM set_config('app.allow_system_type', '1', true);

  INSERT INTO public.dm_messages (conversation_id, author_id, content, system_type, attachments)
  VALUES (_conversation_id, _uid, '', _event, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.report_screen_capture(uuid, text) TO authenticated;
