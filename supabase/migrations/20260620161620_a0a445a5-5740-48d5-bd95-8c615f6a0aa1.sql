
CREATE TABLE public.server_sounds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  emoji TEXT,
  url TEXT NOT NULL,
  volume REAL NOT NULL DEFAULT 1.0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX server_sounds_server_id_idx ON public.server_sounds(server_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.server_sounds TO authenticated;
GRANT ALL ON public.server_sounds TO service_role;

ALTER TABLE public.server_sounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view server sounds"
ON public.server_sounds FOR SELECT
TO authenticated
USING (public.is_server_member(auth.uid(), server_id));

CREATE POLICY "Users with manage_emojis can add sounds"
ON public.server_sounds FOR INSERT
TO authenticated
WITH CHECK (
  creator_id = auth.uid()
  AND (
    public.is_server_owner(auth.uid(), server_id)
    OR public.has_server_permission(auth.uid(), server_id, 'manage_emojis'::server_permission)
  )
);

CREATE POLICY "Users with manage_emojis can update sounds"
ON public.server_sounds FOR UPDATE
TO authenticated
USING (
  public.is_server_owner(auth.uid(), server_id)
  OR public.has_server_permission(auth.uid(), server_id, 'manage_emojis'::server_permission)
);

CREATE POLICY "Users with manage_emojis can delete sounds"
ON public.server_sounds FOR DELETE
TO authenticated
USING (
  public.is_server_owner(auth.uid(), server_id)
  OR public.has_server_permission(auth.uid(), server_id, 'manage_emojis'::server_permission)
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.server_sounds;

-- Storage RLS for server-sounds bucket
CREATE POLICY "Authenticated users can upload sounds"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'server-sounds');

CREATE POLICY "Anyone can view sounds"
ON storage.objects FOR SELECT
USING (bucket_id = 'server-sounds');

CREATE POLICY "Authenticated users can delete their sounds"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'server-sounds');

CREATE POLICY "Authenticated users can update sounds"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'server-sounds');
