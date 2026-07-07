
-- messages: SELECT + INSERT gated by channel-level view_channel/send_messages
DROP POLICY IF EXISTS "Members can view messages" ON public.messages;
CREATE POLICY "Members can view messages"
ON public.messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.channels c
    WHERE c.id = messages.channel_id
      AND has_channel_permission(auth.uid(), c.id, 'view_channel'::server_permission)
  )
);

DROP POLICY IF EXISTS "Members can send messages" ON public.messages;
CREATE POLICY "Members can send messages"
ON public.messages
FOR INSERT
WITH CHECK (
  auth.uid() = author_id
  AND EXISTS (
    SELECT 1 FROM public.channels c
    WHERE c.id = messages.channel_id
      AND has_channel_permission(auth.uid(), c.id, 'view_channel'::server_permission)
      AND has_channel_permission(auth.uid(), c.id, 'send_messages'::server_permission)
  )
);

-- thread_messages
DROP POLICY IF EXISTS "Members can view thread messages" ON public.thread_messages;
CREATE POLICY "Members can view thread messages"
ON public.thread_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.threads t
    JOIN public.channels c ON c.id = t.channel_id
    WHERE t.id = thread_messages.thread_id
      AND has_channel_permission(auth.uid(), c.id, 'view_channel'::server_permission)
  )
);

DROP POLICY IF EXISTS "Members can send thread messages" ON public.thread_messages;
CREATE POLICY "Members can send thread messages"
ON public.thread_messages
FOR INSERT
WITH CHECK (
  auth.uid() = author_id
  AND EXISTS (
    SELECT 1 FROM public.threads t
    JOIN public.channels c ON c.id = t.channel_id
    WHERE t.id = thread_messages.thread_id
      AND has_channel_permission(auth.uid(), c.id, 'view_channel'::server_permission)
      AND has_channel_permission(auth.uid(), c.id, 'send_messages'::server_permission)
  )
);

-- announcements
DROP POLICY IF EXISTS "Members can view announcements" ON public.announcements;
CREATE POLICY "Members can view announcements"
ON public.announcements
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.channels c
    WHERE c.id = announcements.channel_id
      AND has_channel_permission(auth.uid(), c.id, 'view_channel'::server_permission)
  )
);

-- media_posts
DROP POLICY IF EXISTS "Members can view media posts" ON public.media_posts;
CREATE POLICY "Members can view media posts"
ON public.media_posts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.channels c
    WHERE c.id = media_posts.channel_id
      AND has_channel_permission(auth.uid(), c.id, 'view_channel'::server_permission)
  )
);

DROP POLICY IF EXISTS "Members can create media posts" ON public.media_posts;
CREATE POLICY "Members can create media posts"
ON public.media_posts
FOR INSERT
WITH CHECK (
  auth.uid() = author_id
  AND EXISTS (
    SELECT 1 FROM public.channels c
    WHERE c.id = media_posts.channel_id
      AND has_channel_permission(auth.uid(), c.id, 'view_channel'::server_permission)
  )
);

-- forum_posts
DROP POLICY IF EXISTS "Members can view forum posts" ON public.forum_posts;
CREATE POLICY "Members can view forum posts"
ON public.forum_posts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.channels c
    WHERE c.id = forum_posts.channel_id
      AND has_channel_permission(auth.uid(), c.id, 'view_channel'::server_permission)
  )
);

DROP POLICY IF EXISTS "Members can create forum posts" ON public.forum_posts;
CREATE POLICY "Members can create forum posts"
ON public.forum_posts
FOR INSERT
WITH CHECK (
  auth.uid() = author_id
  AND EXISTS (
    SELECT 1 FROM public.channels c
    WHERE c.id = forum_posts.channel_id
      AND has_channel_permission(auth.uid(), c.id, 'view_channel'::server_permission)
      AND has_channel_permission(auth.uid(), c.id, 'create_forum_posts'::server_permission)
  )
);
