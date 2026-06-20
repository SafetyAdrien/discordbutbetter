
-- Emojis bucket
DROP POLICY IF EXISTS "Admins can upload server emoji" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update server emoji" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete server emoji" ON storage.objects;

CREATE POLICY "Owners or manage_emojis can upload server emoji"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'server-emojis'
  AND EXISTS (
    SELECT 1 FROM public.servers s
    WHERE s.id::text = (storage.foldername(objects.name))[1]
      AND (
        s.owner_id = auth.uid()
        OR s.secondary_owner_id = auth.uid()
        OR public.has_server_permission(auth.uid(), s.id, 'manage_emojis'::server_permission)
        OR public.has_server_permission(auth.uid(), s.id, 'manage_server'::server_permission)
      )
  )
);

CREATE POLICY "Owners or manage_emojis can update server emoji"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'server-emojis'
  AND EXISTS (
    SELECT 1 FROM public.servers s
    WHERE s.id::text = (storage.foldername(objects.name))[1]
      AND (
        s.owner_id = auth.uid()
        OR s.secondary_owner_id = auth.uid()
        OR public.has_server_permission(auth.uid(), s.id, 'manage_emojis'::server_permission)
        OR public.has_server_permission(auth.uid(), s.id, 'manage_server'::server_permission)
      )
  )
);

CREATE POLICY "Owners or manage_emojis can delete server emoji"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'server-emojis'
  AND EXISTS (
    SELECT 1 FROM public.servers s
    WHERE s.id::text = (storage.foldername(objects.name))[1]
      AND (
        s.owner_id = auth.uid()
        OR s.secondary_owner_id = auth.uid()
        OR public.has_server_permission(auth.uid(), s.id, 'manage_emojis'::server_permission)
        OR public.has_server_permission(auth.uid(), s.id, 'manage_server'::server_permission)
      )
  )
);

-- Stickers bucket
DROP POLICY IF EXISTS "Admins can upload server sticker" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update server sticker" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete server sticker" ON storage.objects;

CREATE POLICY "Owners or manage_emojis can upload server sticker"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'server-stickers'
  AND EXISTS (
    SELECT 1 FROM public.servers s
    WHERE s.id::text = (storage.foldername(objects.name))[1]
      AND (
        s.owner_id = auth.uid()
        OR s.secondary_owner_id = auth.uid()
        OR public.has_server_permission(auth.uid(), s.id, 'manage_emojis'::server_permission)
        OR public.has_server_permission(auth.uid(), s.id, 'manage_server'::server_permission)
      )
  )
);

CREATE POLICY "Owners or manage_emojis can update server sticker"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'server-stickers'
  AND EXISTS (
    SELECT 1 FROM public.servers s
    WHERE s.id::text = (storage.foldername(objects.name))[1]
      AND (
        s.owner_id = auth.uid()
        OR s.secondary_owner_id = auth.uid()
        OR public.has_server_permission(auth.uid(), s.id, 'manage_emojis'::server_permission)
        OR public.has_server_permission(auth.uid(), s.id, 'manage_server'::server_permission)
      )
  )
);

CREATE POLICY "Owners or manage_emojis can delete server sticker"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'server-stickers'
  AND EXISTS (
    SELECT 1 FROM public.servers s
    WHERE s.id::text = (storage.foldername(objects.name))[1]
      AND (
        s.owner_id = auth.uid()
        OR s.secondary_owner_id = auth.uid()
        OR public.has_server_permission(auth.uid(), s.id, 'manage_emojis'::server_permission)
        OR public.has_server_permission(auth.uid(), s.id, 'manage_server'::server_permission)
      )
  )
);
