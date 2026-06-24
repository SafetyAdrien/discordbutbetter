DROP POLICY IF EXISTS "Members with create_events can insert" ON public.channel_calendar_events;
CREATE POLICY "Members can insert events"
ON public.channel_calendar_events FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by
  AND public.has_channel_permission(auth.uid(), channel_id, 'view_channel'::server_permission)
);

DROP POLICY IF EXISTS "Upload event thumbnails with create_events" ON storage.objects;
CREATE POLICY "Upload event thumbnails for channel members"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'channel-event-thumbnails'
  AND public.has_channel_permission(
    auth.uid(),
    ((storage.foldername(name))[1])::uuid,
    'view_channel'::server_permission
  )
);

DROP POLICY IF EXISTS "Update event thumbnails with create_events" ON storage.objects;
CREATE POLICY "Update event thumbnails for channel members"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'channel-event-thumbnails'
  AND public.has_channel_permission(
    auth.uid(),
    ((storage.foldername(name))[1])::uuid,
    'view_channel'::server_permission
  )
);