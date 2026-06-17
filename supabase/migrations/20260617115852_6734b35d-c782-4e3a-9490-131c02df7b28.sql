
-- Drop old permissive policies
DROP POLICY IF EXISTS "Anyone can view message attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own attachments" ON storage.objects;

-- Security definer helper: can the current user view a given attachment path?
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

-- SELECT policy: only authorized users can view objects in this bucket
CREATE POLICY "Authorized users can view message attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'message-attachments'
  AND public.can_view_message_attachment(auth.uid(), name)
);

-- DELETE: uploader only
CREATE POLICY "Users can delete their own message attachments"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'message-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
