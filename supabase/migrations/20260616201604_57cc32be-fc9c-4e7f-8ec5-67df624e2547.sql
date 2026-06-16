
-- =====================================================
-- 1. Drop buggy duplicates on server-banners / server-icons
--    (these used storage.foldername(servers.name) instead of objects.name)
-- =====================================================
DROP POLICY IF EXISTS "Server owners can delete banners" ON storage.objects;
DROP POLICY IF EXISTS "Server owners can update banners" ON storage.objects;
DROP POLICY IF EXISTS "Server owners can delete icons" ON storage.objects;
DROP POLICY IF EXISTS "Server owners can update icons" ON storage.objects;

-- =====================================================
-- 2. Fix emoji / sticker policies (use objects.name)
-- =====================================================
DROP POLICY IF EXISTS "Admins can delete server emoji" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update server emoji" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete server sticker" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update server sticker" ON storage.objects;

CREATE POLICY "Admins can delete server emoji"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'server-emojis'
  AND EXISTS (
    SELECT 1 FROM public.servers s
    WHERE s.id::text = (storage.foldername(objects.name))[1]
      AND (s.owner_id = auth.uid()
           OR s.secondary_owner_id = auth.uid()
           OR public.has_server_permission(auth.uid(), s.id, 'manage_server'::server_permission))
  )
);

CREATE POLICY "Admins can update server emoji"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'server-emojis'
  AND EXISTS (
    SELECT 1 FROM public.servers s
    WHERE s.id::text = (storage.foldername(objects.name))[1]
      AND (s.owner_id = auth.uid()
           OR s.secondary_owner_id = auth.uid()
           OR public.has_server_permission(auth.uid(), s.id, 'manage_server'::server_permission))
  )
);

CREATE POLICY "Admins can delete server sticker"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'server-stickers'
  AND EXISTS (
    SELECT 1 FROM public.servers s
    WHERE s.id::text = (storage.foldername(objects.name))[1]
      AND (s.owner_id = auth.uid()
           OR s.secondary_owner_id = auth.uid()
           OR public.has_server_permission(auth.uid(), s.id, 'manage_server'::server_permission))
  )
);

CREATE POLICY "Admins can update server sticker"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'server-stickers'
  AND EXISTS (
    SELECT 1 FROM public.servers s
    WHERE s.id::text = (storage.foldername(objects.name))[1]
      AND (s.owner_id = auth.uid()
           OR s.secondary_owner_id = auth.uid()
           OR public.has_server_permission(auth.uid(), s.id, 'manage_server'::server_permission))
  )
);

-- =====================================================
-- 3. Add DELETE/UPDATE policies for role-icons and channel-icons
-- =====================================================
DROP POLICY IF EXISTS "Role managers can delete role icons" ON storage.objects;
DROP POLICY IF EXISTS "Role managers can update role icons" ON storage.objects;
DROP POLICY IF EXISTS "Channel managers can delete channel icons" ON storage.objects;
DROP POLICY IF EXISTS "Channel managers can update channel icons" ON storage.objects;

CREATE POLICY "Role managers can delete role icons"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'role-icons'
  AND EXISTS (
    SELECT 1 FROM public.servers s
    WHERE s.id::text = (storage.foldername(objects.name))[1]
      AND (s.owner_id = auth.uid()
           OR s.secondary_owner_id = auth.uid()
           OR public.has_server_permission(auth.uid(), s.id, 'manage_roles'::server_permission))
  )
);

CREATE POLICY "Role managers can update role icons"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'role-icons'
  AND EXISTS (
    SELECT 1 FROM public.servers s
    WHERE s.id::text = (storage.foldername(objects.name))[1]
      AND (s.owner_id = auth.uid()
           OR s.secondary_owner_id = auth.uid()
           OR public.has_server_permission(auth.uid(), s.id, 'manage_roles'::server_permission))
  )
);

CREATE POLICY "Channel managers can delete channel icons"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'channel-icons'
  AND EXISTS (
    SELECT 1
    FROM public.channels c
    JOIN public.servers s ON s.id = c.server_id
    WHERE c.id::text = (storage.foldername(objects.name))[1]
      AND (s.owner_id = auth.uid()
           OR s.secondary_owner_id = auth.uid()
           OR public.has_server_permission(auth.uid(), s.id, 'manage_channels'::server_permission))
  )
);

CREATE POLICY "Channel managers can update channel icons"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'channel-icons'
  AND EXISTS (
    SELECT 1
    FROM public.channels c
    JOIN public.servers s ON s.id = c.server_id
    WHERE c.id::text = (storage.foldername(objects.name))[1]
      AND (s.owner_id = auth.uid()
           OR s.secondary_owner_id = auth.uid()
           OR public.has_server_permission(auth.uid(), s.id, 'manage_channels'::server_permission))
  )
);

-- =====================================================
-- 4. Revoke anon EXECUTE on sensitive SECURITY DEFINER functions
--    (keep check_username_availability and get_invite_details for pre-auth flows)
-- =====================================================
REVOKE EXECUTE ON FUNCTION public.request_server_deletion(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_friendship_profiles(uuid[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.shares_server_with(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.server_deafen_participant(uuid, uuid, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_secondary_owner(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_channel_webhooks(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.insert_audit_log(uuid, text, uuid, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.find_user_for_friend_request(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.respond_to_deletion_request(uuid, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_server_member(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.unban_member(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_dm_interaction(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_friend_with(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_server_permission(uuid, uuid, server_permission) FROM anon;
REVOKE EXECUTE ON FUNCTION public.shares_dm_with(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.delete_server_as_owner(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.server_mute_participant(uuid, uuid, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_server_channel_permissions(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_dm_conversation(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_server_owner_or_secondary(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.kick_member(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_view_webhook_token(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.remove_secondary_owner(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_dm_participant(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_channel_permission(uuid, uuid, server_permission) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_channel_permissions(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.use_invite(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_mention_everyone(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.transfer_server_ownership(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_server_owner(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.ban_member(uuid, uuid, text) FROM anon;
