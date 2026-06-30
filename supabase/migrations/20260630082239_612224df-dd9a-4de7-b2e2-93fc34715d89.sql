CREATE OR REPLACE FUNCTION public.get_unread_channel_ids(
  _user_id uuid,
  _channel_ids uuid[]
)
RETURNS TABLE (channel_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id AS channel_id
  FROM unnest(_channel_ids) AS c(id)
  WHERE EXISTS (
    SELECT 1 FROM messages m
    WHERE m.channel_id = c.id
      AND m.author_id IS DISTINCT FROM _user_id
      AND m.created_at > COALESCE(
        (SELECT crs.last_read_at FROM channel_read_states crs
         WHERE crs.user_id = _user_id AND crs.channel_id = c.id),
        'epoch'::timestamptz
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_unread_channel_ids(uuid, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unread_channel_ids(uuid, uuid[]) TO service_role;