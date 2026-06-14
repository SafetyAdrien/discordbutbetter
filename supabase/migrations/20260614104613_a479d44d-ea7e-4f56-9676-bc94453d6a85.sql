
DROP POLICY IF EXISTS "Authenticated users can upload server icons" ON storage.objects;
CREATE POLICY "Server admins can upload server icons"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'server-icons'
  AND EXISTS (
    SELECT 1 FROM public.servers s
    WHERE (s.id)::text = (storage.foldername(storage.objects.name))[1]
      AND (
        s.owner_id = auth.uid()
        OR s.secondary_owner_id = auth.uid()
        OR public.has_server_permission(auth.uid(), s.id, 'manage_server'::server_permission)
      )
  )
);

DROP POLICY IF EXISTS "Authenticated users can upload server banners" ON storage.objects;
CREATE POLICY "Server admins can upload server banners"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'server-banners'
  AND EXISTS (
    SELECT 1 FROM public.servers s
    WHERE (s.id)::text = (storage.foldername(storage.objects.name))[1]
      AND (
        s.owner_id = auth.uid()
        OR s.secondary_owner_id = auth.uid()
        OR public.has_server_permission(auth.uid(), s.id, 'manage_server'::server_permission)
      )
  )
);

DROP POLICY IF EXISTS "Authenticated users can upload role icons" ON storage.objects;
CREATE POLICY "Role managers can upload role icons"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'role-icons'
  AND EXISTS (
    SELECT 1 FROM public.servers s
    WHERE (s.id)::text = (storage.foldername(storage.objects.name))[1]
      AND (
        s.owner_id = auth.uid()
        OR s.secondary_owner_id = auth.uid()
        OR public.has_server_permission(auth.uid(), s.id, 'manage_roles'::server_permission)
      )
  )
);

DROP POLICY IF EXISTS "Authenticated users can upload channel icons" ON storage.objects;
CREATE POLICY "Channel managers can upload channel icons"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'channel-icons'
  AND EXISTS (
    SELECT 1
    FROM public.channels c
    JOIN public.servers s ON s.id = c.server_id
    WHERE (c.id)::text = (storage.foldername(storage.objects.name))[1]
      AND (
        s.owner_id = auth.uid()
        OR s.secondary_owner_id = auth.uid()
        OR public.has_server_permission(auth.uid(), s.id, 'manage_channels'::server_permission)
      )
  )
);

DROP POLICY IF EXISTS "Authenticated users can upload message attachments" ON storage.objects;
CREATE POLICY "Users can upload message attachments to their own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'message-attachments'
  AND (auth.uid())::text = (storage.foldername(storage.objects.name))[1]
);

DROP POLICY IF EXISTS "Authenticated users can upload server sticker" ON storage.objects;
