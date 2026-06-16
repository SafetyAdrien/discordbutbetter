
-- 1. Drop overly permissive authenticated-only storage policies
DROP POLICY IF EXISTS "Authenticated users can delete channel icons" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete role icons" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete server banners" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete server emoji" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete server icons" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete server sticker" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update channel icons" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update role icons" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update server banners" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update server emoji" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update server icons" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update server sticker" ON storage.objects;

-- 2. Announcement banners: only users with manage_channels (or admin) can upload; uploader or admins can delete
DROP POLICY IF EXISTS "Authenticated users can upload announcement banners" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their uploaded banners" ON storage.objects;

CREATE POLICY "Channel managers can upload announcement banners"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'announcement-banners'
  AND EXISTS (
    SELECT 1 FROM public.server_members sm
    JOIN public.member_roles mr ON mr.member_id = sm.id
    JOIN public.role_permissions rp ON rp.role_id = mr.role_id
    WHERE sm.user_id = auth.uid()
      AND rp.permission IN ('manage_channels'::public.server_permission,
                            'administrator'::public.server_permission,
                            'manage_server'::public.server_permission)
  )
);

CREATE POLICY "Uploaders or admins can delete announcement banners"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'announcement-banners'
  AND (
    owner = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.server_members sm
      JOIN public.member_roles mr ON mr.member_id = sm.id
      JOIN public.role_permissions rp ON rp.role_id = mr.role_id
      WHERE sm.user_id = auth.uid()
        AND rp.permission IN ('manage_channels'::public.server_permission,
                              'administrator'::public.server_permission,
                              'manage_server'::public.server_permission)
    )
  )
);

-- 3. dm_participants: only existing participants may add users (creation flow uses SECURITY DEFINER function)
DROP POLICY IF EXISTS "Users can add themselves to conversations" ON public.dm_participants;

CREATE POLICY "Existing participants can add users"
ON public.dm_participants FOR INSERT TO authenticated
WITH CHECK (
  public.is_dm_participant(auth.uid(), conversation_id)
);

-- 4. Restrict broad public listing on public buckets to authenticated users
DROP POLICY IF EXISTS "Anyone can view announcement banners" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view message attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view role icons" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view server banners" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view server emoji" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view server icons" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view server stickers" ON storage.objects;
DROP POLICY IF EXISTS "Avatars are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Banners are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Channel icons are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Server banners are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Server emojis are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Server icons are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Server stickers are publicly readable" ON storage.objects;

CREATE POLICY "Authenticated users can read app buckets"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id IN (
    'avatars','banners','server-icons','server-banners',
    'server-emojis','server-stickers','announcement-banners',
    'role-icons','message-attachments','channel-icons'
  )
);

-- 5. Revoke EXECUTE on internal SECURITY DEFINER functions (triggers / internal use only)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_member() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_server() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_thread_last_message() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enforce_lowercase_username() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.send_welcome_message() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.detect_and_insert_mentions() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.protect_voice_state_server_columns() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_voice_signals() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_typing_indicators() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, PUBLIC;
