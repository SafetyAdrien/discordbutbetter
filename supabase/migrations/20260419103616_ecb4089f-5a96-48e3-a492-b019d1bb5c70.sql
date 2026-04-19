-- Fix broken storage policies that referenced s.name (server name) instead of name (object path)
-- Affects upload/update/delete policies for server-emojis and server-stickers buckets

DROP POLICY IF EXISTS "Admins can upload server emoji" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update server emoji" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete server emoji" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload server sticker" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update server sticker" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete server sticker" ON storage.objects;

CREATE POLICY "Admins can upload server emoji"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'server-emojis'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM servers s
    WHERE s.id::text = (storage.foldername(name))[1]
      AND (
        s.owner_id = auth.uid()
        OR s.secondary_owner_id = auth.uid()
        OR has_server_permission(auth.uid(), s.id, 'manage_server'::server_permission)
      )
  )
);

CREATE POLICY "Admins can update server emoji"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'server-emojis'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM servers s
    WHERE s.id::text = (storage.foldername(name))[1]
      AND (
        s.owner_id = auth.uid()
        OR s.secondary_owner_id = auth.uid()
        OR has_server_permission(auth.uid(), s.id, 'manage_server'::server_permission)
      )
  )
);

CREATE POLICY "Admins can delete server emoji"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'server-emojis'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM servers s
    WHERE s.id::text = (storage.foldername(name))[1]
      AND (
        s.owner_id = auth.uid()
        OR s.secondary_owner_id = auth.uid()
        OR has_server_permission(auth.uid(), s.id, 'manage_server'::server_permission)
      )
  )
);

CREATE POLICY "Admins can upload server sticker"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'server-stickers'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM servers s
    WHERE s.id::text = (storage.foldername(name))[1]
      AND (
        s.owner_id = auth.uid()
        OR s.secondary_owner_id = auth.uid()
        OR has_server_permission(auth.uid(), s.id, 'manage_server'::server_permission)
      )
  )
);

CREATE POLICY "Admins can update server sticker"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'server-stickers'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM servers s
    WHERE s.id::text = (storage.foldername(name))[1]
      AND (
        s.owner_id = auth.uid()
        OR s.secondary_owner_id = auth.uid()
        OR has_server_permission(auth.uid(), s.id, 'manage_server'::server_permission)
      )
  )
);

CREATE POLICY "Admins can delete server sticker"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'server-stickers'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM servers s
    WHERE s.id::text = (storage.foldername(name))[1]
      AND (
        s.owner_id = auth.uid()
        OR s.secondary_owner_id = auth.uid()
        OR has_server_permission(auth.uid(), s.id, 'manage_server'::server_permission)
      )
  )
);