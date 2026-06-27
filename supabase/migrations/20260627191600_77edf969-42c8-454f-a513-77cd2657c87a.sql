-- A. storage.objects: remove message-attachments from broad bucket policy
DROP POLICY IF EXISTS "Authenticated users can read app buckets" ON storage.objects;

CREATE POLICY "Authenticated users can read app buckets"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = ANY (ARRAY[
    'avatars',
    'banners',
    'server-icons',
    'server-banners',
    'server-emojis',
    'server-stickers',
    'announcement-banners',
    'role-icons',
    'channel-icons'
  ])
);

-- B. calendar_events: drop permissive SELECT policies, replace with relationship-gated single policy
DROP POLICY IF EXISTS "View own or public events" ON public.calendar_events;
DROP POLICY IF EXISTS "Public events visible to related users" ON public.calendar_events;

CREATE POLICY "View own or related public events"
ON public.calendar_events
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR (
    is_public = true
    AND (
      public.is_friend_with(auth.uid(), user_id)
      OR public.shares_server_with(auth.uid(), user_id)
      OR public.shares_dm_with(auth.uid(), user_id)
    )
  )
);

-- C. user_badges: replace USING true with relationship-gated policy (same model as profiles)
DROP POLICY IF EXISTS "User badges are readable by authenticated users" ON public.user_badges;

CREATE POLICY "User badges visible to self or related users"
ON public.user_badges
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_friend_with(auth.uid(), user_id)
  OR public.shares_server_with(auth.uid(), user_id)
  OR public.shares_dm_with(auth.uid(), user_id)
);