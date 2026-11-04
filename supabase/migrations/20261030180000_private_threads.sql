-- Fils prives : acces restreint aux roles / membres choisis a la creation.
--
-- Jusqu'ici `threads.is_private` n'etait qu'un booleen sans aucune application : tout membre du
-- serveur voyait le fil. Cette migration ajoute la liste d'acces (`thread_access`) et applique
-- la restriction sur le fil, ses messages, ses reactions, ses sondages, ses abonnes et ses pieces jointes.

-- 1. Liste d'acces : une ligne = un role OU un membre invite.
CREATE TABLE IF NOT EXISTS public.thread_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  role_id uuid REFERENCES public.roles(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT thread_access_role_xor_user CHECK ((role_id IS NULL) <> (user_id IS NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS thread_access_thread_role_key ON public.thread_access (thread_id, role_id) WHERE role_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS thread_access_thread_user_key ON public.thread_access (thread_id, user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS thread_access_user_idx ON public.thread_access (user_id) WHERE user_id IS NOT NULL;
ALTER TABLE public.thread_access ENABLE ROW LEVEL SECURITY;

-- 2. Qui peut gerer un fil (createur, proprietaires, moderateurs).
CREATE OR REPLACE FUNCTION public.can_moderate_thread(_uid uuid, _thread_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.threads t
    JOIN public.channels c ON c.id = t.channel_id
    WHERE t.id = _thread_id
      AND _uid IS NOT NULL
      AND (
        t.created_by = _uid
        OR public.is_server_owner_or_secondary(_uid, c.server_id)
        OR public.has_channel_permission(_uid, c.id, 'manage_threads'::server_permission)
        OR public.has_channel_permission(_uid, c.id, 'manage_channels'::server_permission)
      )
  );
$$;

-- 3. Acces a un fil : public => tout le monde ; prive => createur, moderateurs, membres et roles invites.
CREATE OR REPLACE FUNCTION public.can_access_thread(_uid uuid, _thread_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.threads t
    JOIN public.channels c ON c.id = t.channel_id
    WHERE t.id = _thread_id
      AND (
        NOT COALESCE(t.is_private, false)
        OR public.can_moderate_thread(_uid, t.id)
        OR EXISTS (
          SELECT 1 FROM public.thread_access ta
          WHERE ta.thread_id = t.id AND ta.user_id = _uid
        )
        OR EXISTS (
          SELECT 1
          FROM public.thread_access ta
          JOIN public.member_roles mr ON mr.role_id = ta.role_id
          JOIN public.server_members sm ON sm.id = mr.member_id
          WHERE ta.thread_id = t.id AND sm.user_id = _uid AND sm.server_id = c.server_id
        )
      )
  );
$$;

REVOKE EXECUTE ON FUNCTION public.can_moderate_thread(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_access_thread(uuid, uuid) FROM anon;

-- 4. thread_access : visible par ceux qui voient le fil ; gere par le createur / les moderateurs.
DROP POLICY IF EXISTS "Thread access visible to participants" ON public.thread_access;
CREATE POLICY "Thread access visible to participants" ON public.thread_access
  FOR SELECT TO authenticated
  USING (public.can_access_thread(auth.uid(), thread_id));

DROP POLICY IF EXISTS "Thread moderators manage access insert" ON public.thread_access;
CREATE POLICY "Thread moderators manage access insert" ON public.thread_access
  FOR INSERT TO authenticated
  WITH CHECK (public.can_moderate_thread(auth.uid(), thread_id));

DROP POLICY IF EXISTS "Thread moderators manage access delete" ON public.thread_access;
CREATE POLICY "Thread moderators manage access delete" ON public.thread_access
  FOR DELETE TO authenticated
  USING (public.can_moderate_thread(auth.uid(), thread_id));

-- 5. threads : un fil prive n'est visible que par les personnes autorisees.
DROP POLICY IF EXISTS "Members can view threads in their server channels" ON public.threads;
CREATE POLICY "Members can view threads in their server channels"
ON public.threads
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.channels c
    WHERE c.id = threads.channel_id
      AND is_server_member(auth.uid(), c.server_id)
  )
  -- `created_by` est teste sur la ligne elle-meme : lors d'un INSERT ... RETURNING, une fonction STABLE
  -- ne voit pas encore la ligne en cours d'insertion.
  AND (threads.created_by = auth.uid() OR public.can_access_thread(auth.uid(), threads.id))
);

-- 6. thread_messages
DROP POLICY IF EXISTS "Members can view thread messages" ON public.thread_messages;
CREATE POLICY "Members can view thread messages"
ON public.thread_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.threads t
    JOIN public.channels c ON c.id = t.channel_id
    WHERE t.id = thread_messages.thread_id
      AND has_channel_permission(auth.uid(), c.id, 'view_channel'::server_permission)
      AND public.can_access_thread(auth.uid(), t.id)
  )
);

DROP POLICY IF EXISTS "Members can send thread messages" ON public.thread_messages;
CREATE POLICY "Members can send thread messages"
ON public.thread_messages
FOR INSERT
WITH CHECK (
  auth.uid() = author_id
  AND EXISTS (
    SELECT 1 FROM public.threads t
    JOIN public.channels c ON c.id = t.channel_id
    WHERE t.id = thread_messages.thread_id
      AND has_channel_permission(auth.uid(), c.id, 'view_channel'::server_permission)
      AND has_channel_permission(auth.uid(), c.id, 'send_messages'::server_permission)
      AND public.can_access_thread(auth.uid(), t.id)
  )
);

-- 7. thread_followers
DROP POLICY IF EXISTS "Members can view thread followers" ON public.thread_followers;
CREATE POLICY "Members can view thread followers"
ON public.thread_followers FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.threads t
  JOIN public.channels c ON c.id = t.channel_id
  WHERE t.id = thread_followers.thread_id
    AND is_server_member(auth.uid(), c.server_id)
    AND public.can_access_thread(auth.uid(), t.id)
));

-- 8. Reactions des messages de fil
DROP POLICY IF EXISTS "Members can view thread reactions" ON public.thread_message_reactions;
CREATE POLICY "Members can view thread reactions"
ON public.thread_message_reactions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.thread_messages tm
  JOIN public.threads t ON t.id = tm.thread_id
  JOIN public.channels c ON c.id = t.channel_id
  WHERE tm.id = thread_message_reactions.message_id
    AND is_server_member(auth.uid(), c.server_id)
    AND public.can_access_thread(auth.uid(), t.id)
));

DROP POLICY IF EXISTS "Members can add thread reactions" ON public.thread_message_reactions;
CREATE POLICY "Members can add thread reactions"
ON public.thread_message_reactions FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.thread_messages tm
    JOIN public.threads t ON t.id = tm.thread_id
    JOIN public.channels c ON c.id = t.channel_id
    WHERE tm.id = thread_message_reactions.message_id
      AND is_server_member(auth.uid(), c.server_id)
      AND public.can_access_thread(auth.uid(), t.id)
  )
);

-- 9. Sondages poses dans un fil
DROP POLICY IF EXISTS "Members can create polls" ON public.polls;
CREATE POLICY "Members can create polls" ON public.polls
  FOR INSERT
  WITH CHECK (
    auth.uid() = author_id AND (
      (thread_id IS NULL AND EXISTS (
        SELECT 1 FROM public.channels c WHERE c.id = channel_id AND is_server_member(auth.uid(), c.server_id)
      ))
      OR
      (thread_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.threads t
        JOIN public.channels c ON c.id = t.channel_id
        WHERE t.id = thread_id AND is_server_member(auth.uid(), c.server_id)
          AND public.can_access_thread(auth.uid(), t.id)
      ))
    )
  );

DROP POLICY IF EXISTS "Members can view polls" ON public.polls;
CREATE POLICY "Members can view polls" ON public.polls
  FOR SELECT
  USING (
    (thread_id IS NULL AND EXISTS (
      SELECT 1 FROM public.channels c WHERE c.id = channel_id AND is_server_member(auth.uid(), c.server_id)
    ))
    OR
    (thread_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.threads t
      JOIN public.channels c ON c.id = t.channel_id
      WHERE t.id = thread_id AND is_server_member(auth.uid(), c.server_id)
        AND public.can_access_thread(auth.uid(), t.id)
    ))
  );

-- 10. Pieces jointes des messages de fil
CREATE OR REPLACE FUNCTION public.can_view_message_attachment(_user_id uuid, _path text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _needle text;
  _parts text[];
  _channel_id uuid;
BEGIN
  IF _user_id IS NULL OR _path IS NULL THEN
    RETURN false;
  END IF;

  -- Uploader (path = "<user_id>/..." or "media/<channel_id>/...")
  _parts := string_to_array(_path, '/');
  IF array_length(_parts, 1) >= 1 AND _parts[1] = _user_id::text THEN
    RETURN true;
  END IF;

  -- media posts: path = "media/<channel_id>/<file>"
  IF array_length(_parts, 1) >= 3 AND _parts[1] = 'media' THEN
    BEGIN
      _channel_id := _parts[2]::uuid;
    EXCEPTION WHEN others THEN
      _channel_id := NULL;
    END;
    IF _channel_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.channels c
      WHERE c.id = _channel_id
        AND public.is_server_member(_user_id, c.server_id)
    ) THEN
      RETURN true;
    END IF;
  END IF;

  -- Match by path substring in stored attachment URLs
  _needle := '%' || _path || '%';

  -- Channel messages the user can see
  IF EXISTS (
    SELECT 1
    FROM public.messages m
    JOIN public.channels c ON c.id = m.channel_id
    WHERE m.attachments::text LIKE _needle
      AND public.is_server_member(_user_id, c.server_id)
  ) THEN
    RETURN true;
  END IF;

  -- DM messages where the user is a participant
  IF EXISTS (
    SELECT 1
    FROM public.dm_messages dm
    WHERE dm.attachments::text LIKE _needle
      AND public.is_dm_participant(_user_id, dm.conversation_id)
  ) THEN
    RETURN true;
  END IF;

  -- Thread messages
  IF EXISTS (
    SELECT 1
    FROM public.thread_messages tm
    JOIN public.threads t ON t.id = tm.thread_id
    JOIN public.channels c ON c.id = t.channel_id
    WHERE tm.attachments::text LIKE _needle
      AND public.is_server_member(_user_id, c.server_id)
      AND public.can_access_thread(_user_id, t.id)
  ) THEN
    RETURN true;
  END IF;

  -- Media post items
  IF EXISTS (
    SELECT 1
    FROM public.media_post_items mpi
    JOIN public.media_posts mp ON mp.id = mpi.post_id
    JOIN public.channels c ON c.id = mp.channel_id
    WHERE (mpi.url LIKE _needle OR mpi.thumbnail_url LIKE _needle)
      AND public.is_server_member(_user_id, c.server_id)
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;
