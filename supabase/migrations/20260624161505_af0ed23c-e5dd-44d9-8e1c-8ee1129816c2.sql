CREATE POLICY "View event thumbnails for channel members"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'channel-event-thumbnails'
  AND public.has_channel_permission(
    auth.uid(),
    ((storage.foldername(name))[1])::uuid,
    'view_channel'::server_permission
  )
);

CREATE POLICY "Upload event thumbnails with create_events"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'channel-event-thumbnails'
  AND (
    public.has_channel_permission(
      auth.uid(),
      ((storage.foldername(name))[1])::uuid,
      'create_events'::server_permission
    )
    OR public.has_channel_permission(
      auth.uid(),
      ((storage.foldername(name))[1])::uuid,
      'manage_events'::server_permission
    )
  )
);

CREATE POLICY "Update event thumbnails with create_events"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'channel-event-thumbnails'
  AND (
    public.has_channel_permission(
      auth.uid(),
      ((storage.foldername(name))[1])::uuid,
      'create_events'::server_permission
    )
    OR public.has_channel_permission(
      auth.uid(),
      ((storage.foldername(name))[1])::uuid,
      'manage_events'::server_permission
    )
  )
);

CREATE POLICY "Delete event thumbnails with create_events"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'channel-event-thumbnails'
  AND (
    public.has_channel_permission(
      auth.uid(),
      ((storage.foldername(name))[1])::uuid,
      'create_events'::server_permission
    )
    OR public.has_channel_permission(
      auth.uid(),
      ((storage.foldername(name))[1])::uuid,
      'manage_events'::server_permission
    )
  )
);