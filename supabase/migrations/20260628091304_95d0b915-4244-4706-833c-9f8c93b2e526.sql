
-- forum_post_comments: allow channel moderators (manage_forum_posts) to delete
DROP POLICY IF EXISTS "Authors or admins can delete comments" ON public.forum_post_comments;
CREATE POLICY "Authors or moderators can delete comments"
ON public.forum_post_comments
FOR DELETE
USING (
  author_id = auth.uid()
  OR public.is_app_admin()
  OR public.has_channel_permission(
    auth.uid(),
    (SELECT channel_id FROM public.forum_posts WHERE id = forum_post_comments.post_id),
    'manage_forum_posts'::server_permission
  )
);

-- forum_posts: allow channel moderators to delete + update (pin/lock/archive/edit)
DROP POLICY IF EXISTS "Authors or admins can delete forum posts" ON public.forum_posts;
CREATE POLICY "Authors or moderators can delete forum posts"
ON public.forum_posts
FOR DELETE
USING (
  author_id = auth.uid()
  OR public.is_app_admin()
  OR public.has_channel_permission(auth.uid(), channel_id, 'manage_forum_posts'::server_permission)
);

DROP POLICY IF EXISTS "Authors or admins can update forum posts" ON public.forum_posts;
CREATE POLICY "Authors or moderators can update forum posts"
ON public.forum_posts
FOR UPDATE
USING (
  author_id = auth.uid()
  OR public.is_app_admin()
  OR public.has_channel_permission(auth.uid(), channel_id, 'manage_forum_posts'::server_permission)
  OR public.has_channel_permission(auth.uid(), channel_id, 'pin_forum_posts'::server_permission)
  OR public.has_channel_permission(auth.uid(), channel_id, 'lock_forum_posts'::server_permission)
  OR public.has_channel_permission(auth.uid(), channel_id, 'archive_forum_posts'::server_permission)
)
WITH CHECK (
  author_id = auth.uid()
  OR public.is_app_admin()
  OR public.has_channel_permission(auth.uid(), channel_id, 'manage_forum_posts'::server_permission)
  OR public.has_channel_permission(auth.uid(), channel_id, 'pin_forum_posts'::server_permission)
  OR public.has_channel_permission(auth.uid(), channel_id, 'lock_forum_posts'::server_permission)
  OR public.has_channel_permission(auth.uid(), channel_id, 'archive_forum_posts'::server_permission)
);

-- polls: allow channel moderators (manage_polls)
DROP POLICY IF EXISTS "Authors can update their polls" ON public.polls;
CREATE POLICY "Authors or moderators can update polls"
ON public.polls
FOR UPDATE
USING (
  auth.uid() = author_id
  OR (channel_id IS NOT NULL AND public.has_channel_permission(auth.uid(), channel_id, 'manage_polls'::server_permission))
  OR (thread_id IS NOT NULL AND public.has_channel_permission(
       auth.uid(),
       (SELECT channel_id FROM public.threads WHERE id = polls.thread_id),
       'manage_polls'::server_permission
     ))
);

DROP POLICY IF EXISTS "Authors can delete their polls" ON public.polls;
CREATE POLICY "Authors or moderators can delete polls"
ON public.polls
FOR DELETE
USING (
  auth.uid() = author_id
  OR (channel_id IS NOT NULL AND public.has_channel_permission(auth.uid(), channel_id, 'manage_polls'::server_permission))
  OR (thread_id IS NOT NULL AND public.has_channel_permission(
       auth.uid(),
       (SELECT channel_id FROM public.threads WHERE id = polls.thread_id),
       'manage_polls'::server_permission
     ))
);

-- media_posts: allow channel moderators (manage_media)
DROP POLICY IF EXISTS "Authors can delete their media posts" ON public.media_posts;
CREATE POLICY "Authors or moderators can delete media posts"
ON public.media_posts
FOR DELETE
USING (
  auth.uid() = author_id
  OR public.has_channel_permission(auth.uid(), channel_id, 'manage_media'::server_permission)
);
