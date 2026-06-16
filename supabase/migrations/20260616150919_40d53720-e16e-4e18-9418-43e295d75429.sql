
-- 1) Restrict server_bans SELECT to moderators/owners only
DROP POLICY IF EXISTS "Members can view bans" ON public.server_bans;
CREATE POLICY "Moderators can view bans"
ON public.server_bans
FOR SELECT
USING (
  public.is_server_owner(auth.uid(), server_id)
  OR public.has_server_permission(auth.uid(), server_id, 'ban_members'::server_permission)
);

-- 2) Remove webhooks from realtime publication so tokens are not broadcast
ALTER PUBLICATION supabase_realtime DROP TABLE public.webhooks;

-- 3) Storage: scope announcement-banners policies to the file's server folder
DROP POLICY IF EXISTS "Channel managers can upload announcement banners" ON storage.objects;
DROP POLICY IF EXISTS "Uploaders or admins can delete announcement banners" ON storage.objects;

CREATE POLICY "Channel managers can upload announcement banners"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'announcement-banners'
  AND (storage.foldername(name))[1] IS NOT NULL
  AND (
    public.has_server_permission(auth.uid(), ((storage.foldername(name))[1])::uuid, 'manage_channels'::server_permission)
    OR public.has_server_permission(auth.uid(), ((storage.foldername(name))[1])::uuid, 'administrator'::server_permission)
    OR public.has_server_permission(auth.uid(), ((storage.foldername(name))[1])::uuid, 'manage_server'::server_permission)
  )
);

CREATE POLICY "Uploaders or admins can delete announcement banners"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'announcement-banners'
  AND (
    owner = auth.uid()
    OR (
      (storage.foldername(name))[1] IS NOT NULL
      AND (
        public.has_server_permission(auth.uid(), ((storage.foldername(name))[1])::uuid, 'manage_channels'::server_permission)
        OR public.has_server_permission(auth.uid(), ((storage.foldername(name))[1])::uuid, 'administrator'::server_permission)
        OR public.has_server_permission(auth.uid(), ((storage.foldername(name))[1])::uuid, 'manage_server'::server_permission)
      )
    )
  )
);

-- 4) Revoke EXECUTE from anon on privileged SECURITY DEFINER functions
-- Keep accessible to anon: get_invite_details (invite preview), check_username_availability (signup)
REVOKE EXECUTE ON FUNCTION public.ban_member(uuid, uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.kick_member(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.unban_member(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_secondary_owner(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.remove_secondary_owner(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.transfer_server_ownership(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.request_server_deletion(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.respond_to_deletion_request(uuid, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.delete_server_as_owner(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.server_mute_participant(uuid, uuid, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.server_deafen_participant(uuid, uuid, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.insert_audit_log(uuid, text, uuid, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.use_invite(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_dm_conversation(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.find_user_for_friend_request(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_friendship_profiles(uuid[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_channel_webhooks(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_view_webhook_token(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_dm_interaction(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.shares_server_with(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.shares_dm_with(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_friend_with(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_server_member(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_server_owner(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_server_owner_or_secondary(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_dm_participant(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_server_permission(uuid, uuid, server_permission) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_channel_permission(uuid, uuid, server_permission) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_channel_permissions(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_server_channel_permissions(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_mention_everyone(uuid, uuid) FROM anon;
