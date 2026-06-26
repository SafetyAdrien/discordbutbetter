
CREATE OR REPLACE FUNCTION public.get_dm_last_messages()
RETURNS TABLE (
  conversation_id uuid,
  content text,
  created_at timestamptz,
  author_id uuid,
  author_display_name text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT DISTINCT ON (m.conversation_id)
    m.conversation_id,
    m.content,
    m.created_at,
    m.author_id,
    p.display_name AS author_display_name
  FROM public.dm_messages m
  LEFT JOIN public.profiles p ON p.id = m.author_id
  WHERE m.conversation_id IN (
    SELECT dp.conversation_id
    FROM public.dm_participants dp
    WHERE dp.user_id = auth.uid()
  )
  ORDER BY m.conversation_id, m.created_at DESC
$$;

GRANT EXECUTE ON FUNCTION public.get_dm_last_messages() TO authenticated;
