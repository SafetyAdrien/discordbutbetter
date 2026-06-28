-- P0 Fix — Re-attach create_events / manage_events to write paths previously
-- downgraded to view_channel by migration 20260624162703.

-- 1) channel_calendar_events INSERT: require create_events
DROP POLICY IF EXISTS "Members can insert events" ON public.channel_calendar_events;
DROP POLICY IF EXISTS "Members with create_events can insert" ON public.channel_calendar_events;
CREATE POLICY "Users with create_events can insert calendar events"
ON public.channel_calendar_events FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by
  AND public.has_channel_permission(auth.uid(), channel_id, 'create_events'::server_permission)
);

-- 2) storage.objects (bucket channel-event-thumbnails):
--    INSERT → create_events, UPDATE → manage_events, DELETE → manage_events
DROP POLICY IF EXISTS "Upload event thumbnails for channel members" ON storage.objects;
DROP POLICY IF EXISTS "Upload event thumbnails with create_events" ON storage.objects;
CREATE POLICY "Upload event thumbnails with create_events"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'channel-event-thumbnails'
  AND public.has_channel_permission(
    auth.uid(),
    ((storage.foldername(name))[1])::uuid,
    'create_events'::server_permission
  )
);

DROP POLICY IF EXISTS "Update event thumbnails for channel members" ON storage.objects;
DROP POLICY IF EXISTS "Update event thumbnails with create_events" ON storage.objects;
DROP POLICY IF EXISTS "Update event thumbnails with manage_events" ON storage.objects;
CREATE POLICY "Update event thumbnails with manage_events"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'channel-event-thumbnails'
  AND public.has_channel_permission(
    auth.uid(),
    ((storage.foldername(name))[1])::uuid,
    'manage_events'::server_permission
  )
);

DROP POLICY IF EXISTS "Delete event thumbnails for channel members" ON storage.objects;
DROP POLICY IF EXISTS "Delete event thumbnails with manage_events" ON storage.objects;
CREATE POLICY "Delete event thumbnails with manage_events"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'channel-event-thumbnails'
  AND public.has_channel_permission(
    auth.uid(),
    ((storage.foldername(name))[1])::uuid,
    'manage_events'::server_permission
  )
);
