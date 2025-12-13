-- Fix 1: Remove direct webhook SELECT policy and force all access through secure RPC
-- The get_channel_webhooks function already properly masks tokens for non-authorized users
DROP POLICY IF EXISTS "Members can view webhooks" ON public.webhooks;

-- Create a more restrictive policy that only allows viewing webhooks you created or have admin access to
CREATE POLICY "Users can view webhooks they manage"
ON public.webhooks
FOR SELECT
USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM channels c
    WHERE c.id = webhooks.channel_id
    AND has_server_permission(auth.uid(), c.server_id, 'manage_channels'::server_permission)
  )
);

-- Fix 2: Update storage policies for server assets to verify actual server ownership
-- First, drop existing overly permissive policies

-- server-icons bucket
DROP POLICY IF EXISTS "Server owners can delete server icon" ON storage.objects;
DROP POLICY IF EXISTS "Server owners can update server icon" ON storage.objects;
DROP POLICY IF EXISTS "Server owners can upload server icon" ON storage.objects;

-- server-banners bucket
DROP POLICY IF EXISTS "Server owners can delete server banner" ON storage.objects;
DROP POLICY IF EXISTS "Server owners can update server banner" ON storage.objects;
DROP POLICY IF EXISTS "Server owners can upload server banner" ON storage.objects;

-- server-emojis bucket
DROP POLICY IF EXISTS "Server owners can delete server emoji" ON storage.objects;
DROP POLICY IF EXISTS "Server owners can upload server emoji" ON storage.objects;

-- server-stickers bucket
DROP POLICY IF EXISTS "Server owners can delete server sticker" ON storage.objects;
DROP POLICY IF EXISTS "Server owners can upload server sticker" ON storage.objects;

-- Create secure storage policies that verify server ownership
-- Pattern: files stored as {server_id}/{filename}

-- server-icons policies
CREATE POLICY "Server owners can upload server icon"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'server-icons'
  AND public.is_server_owner(auth.uid(), (storage.foldername(name))[1]::uuid)
);

CREATE POLICY "Server owners can update server icon"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'server-icons'
  AND public.is_server_owner(auth.uid(), (storage.foldername(name))[1]::uuid)
);

CREATE POLICY "Server owners can delete server icon"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'server-icons'
  AND public.is_server_owner(auth.uid(), (storage.foldername(name))[1]::uuid)
);

-- server-banners policies
CREATE POLICY "Server owners can upload server banner"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'server-banners'
  AND public.is_server_owner(auth.uid(), (storage.foldername(name))[1]::uuid)
);

CREATE POLICY "Server owners can update server banner"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'server-banners'
  AND public.is_server_owner(auth.uid(), (storage.foldername(name))[1]::uuid)
);

CREATE POLICY "Server owners can delete server banner"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'server-banners'
  AND public.is_server_owner(auth.uid(), (storage.foldername(name))[1]::uuid)
);

-- server-emojis policies (admins with manage_server permission can also manage)
CREATE POLICY "Admins can upload server emoji"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'server-emojis'
  AND (
    public.is_server_owner(auth.uid(), (storage.foldername(name))[1]::uuid)
    OR public.has_server_permission(auth.uid(), (storage.foldername(name))[1]::uuid, 'manage_server'::public.server_permission)
  )
);

CREATE POLICY "Admins can delete server emoji"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'server-emojis'
  AND (
    public.is_server_owner(auth.uid(), (storage.foldername(name))[1]::uuid)
    OR public.has_server_permission(auth.uid(), (storage.foldername(name))[1]::uuid, 'manage_server'::public.server_permission)
  )
);

-- server-stickers policies (admins with manage_server permission can also manage)
CREATE POLICY "Admins can upload server sticker"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'server-stickers'
  AND (
    public.is_server_owner(auth.uid(), (storage.foldername(name))[1]::uuid)
    OR public.has_server_permission(auth.uid(), (storage.foldername(name))[1]::uuid, 'manage_server'::public.server_permission)
  )
);

CREATE POLICY "Admins can delete server sticker"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'server-stickers'
  AND (
    public.is_server_owner(auth.uid(), (storage.foldername(name))[1]::uuid)
    OR public.has_server_permission(auth.uid(), (storage.foldername(name))[1]::uuid, 'manage_server'::public.server_permission)
  )
);