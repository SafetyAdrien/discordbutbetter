
DROP POLICY IF EXISTS "Anyone can view sounds" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload sounds" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete their sounds" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update sounds" ON storage.objects;

CREATE POLICY "Members can view server sounds files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'server-sounds'
  AND public.is_server_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Managers can upload server sounds files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'server-sounds'
  AND public.has_server_permission(auth.uid(), ((storage.foldername(name))[1])::uuid, 'manage_emojis'::server_permission)
);

CREATE POLICY "Managers can update server sounds files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'server-sounds'
  AND public.has_server_permission(auth.uid(), ((storage.foldername(name))[1])::uuid, 'manage_emojis'::server_permission)
);

CREATE POLICY "Managers can delete server sounds files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'server-sounds'
  AND public.has_server_permission(auth.uid(), ((storage.foldername(name))[1])::uuid, 'manage_emojis'::server_permission)
);
