-- Fix storage bucket policies for server-icons, server-banners, server-emojis, and server-stickers
-- Drop existing overly permissive policies and replace with proper authorization checks

-- ============================================
-- SERVER-ICONS BUCKET POLICIES
-- ============================================

-- Drop existing policies for server-icons
DROP POLICY IF EXISTS "Authenticated users can upload server icons" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view server icons" ON storage.objects;
DROP POLICY IF EXISTS "Server owners can delete icons" ON storage.objects;
DROP POLICY IF EXISTS "Server owners can update icons" ON storage.objects;
DROP POLICY IF EXISTS "Server owners can upload server icon" ON storage.objects;

-- Create new secure policies for server-icons
-- Upload: Only server owners/secondary owners can upload
CREATE POLICY "Server owners can upload server icon"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'server-icons' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.servers
    WHERE id::text = (storage.foldername(name))[1]
    AND (owner_id = auth.uid() OR secondary_owner_id = auth.uid())
  )
);

-- View: Anyone can view (icons are public)
CREATE POLICY "Anyone can view server icons"
ON storage.objects FOR SELECT
USING (bucket_id = 'server-icons');

-- Update: Only server owners can update
CREATE POLICY "Server owners can update icons"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'server-icons' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.servers
    WHERE id::text = (storage.foldername(name))[1]
    AND (owner_id = auth.uid() OR secondary_owner_id = auth.uid())
  )
);

-- Delete: Only server owners can delete
CREATE POLICY "Server owners can delete icons"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'server-icons' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.servers
    WHERE id::text = (storage.foldername(name))[1]
    AND (owner_id = auth.uid() OR secondary_owner_id = auth.uid())
  )
);

-- ============================================
-- SERVER-BANNERS BUCKET POLICIES
-- ============================================

-- Drop existing policies for server-banners
DROP POLICY IF EXISTS "Authenticated users can upload server banners" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view server banners" ON storage.objects;
DROP POLICY IF EXISTS "Server owners can delete banners" ON storage.objects;
DROP POLICY IF EXISTS "Server owners can update banners" ON storage.objects;
DROP POLICY IF EXISTS "Server owners can upload server banner" ON storage.objects;

-- Create new secure policies for server-banners
CREATE POLICY "Server owners can upload server banner"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'server-banners' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.servers
    WHERE id::text = (storage.foldername(name))[1]
    AND (owner_id = auth.uid() OR secondary_owner_id = auth.uid())
  )
);

CREATE POLICY "Anyone can view server banners"
ON storage.objects FOR SELECT
USING (bucket_id = 'server-banners');

CREATE POLICY "Server owners can update banners"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'server-banners' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.servers
    WHERE id::text = (storage.foldername(name))[1]
    AND (owner_id = auth.uid() OR secondary_owner_id = auth.uid())
  )
);

CREATE POLICY "Server owners can delete banners"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'server-banners' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.servers
    WHERE id::text = (storage.foldername(name))[1]
    AND (owner_id = auth.uid() OR secondary_owner_id = auth.uid())
  )
);

-- ============================================
-- SERVER-EMOJIS BUCKET POLICIES
-- ============================================

-- Drop existing policies for server-emojis
DROP POLICY IF EXISTS "Authenticated users can upload server emoji" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view server emoji" ON storage.objects;
DROP POLICY IF EXISTS "Server owners can delete emoji" ON storage.objects;
DROP POLICY IF EXISTS "Server owners can update emoji" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload server emoji" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete server emoji" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update server emoji" ON storage.objects;

-- Create new secure policies for server-emojis
-- Upload: Server owners or users with manage_server permission
CREATE POLICY "Admins can upload server emoji"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'server-emojis' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.servers s
    WHERE s.id::text = (storage.foldername(name))[1]
    AND (
      s.owner_id = auth.uid() 
      OR s.secondary_owner_id = auth.uid()
      OR public.has_server_permission(auth.uid(), s.id, 'manage_server')
    )
  )
);

CREATE POLICY "Anyone can view server emoji"
ON storage.objects FOR SELECT
USING (bucket_id = 'server-emojis');

CREATE POLICY "Admins can update server emoji"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'server-emojis' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.servers s
    WHERE s.id::text = (storage.foldername(name))[1]
    AND (
      s.owner_id = auth.uid() 
      OR s.secondary_owner_id = auth.uid()
      OR public.has_server_permission(auth.uid(), s.id, 'manage_server')
    )
  )
);

CREATE POLICY "Admins can delete server emoji"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'server-emojis' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.servers s
    WHERE s.id::text = (storage.foldername(name))[1]
    AND (
      s.owner_id = auth.uid() 
      OR s.secondary_owner_id = auth.uid()
      OR public.has_server_permission(auth.uid(), s.id, 'manage_server')
    )
  )
);

-- ============================================
-- SERVER-STICKERS BUCKET POLICIES
-- ============================================

-- Drop existing policies for server-stickers
DROP POLICY IF EXISTS "Authenticated users can upload server stickers" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view server stickers" ON storage.objects;
DROP POLICY IF EXISTS "Server owners can delete stickers" ON storage.objects;
DROP POLICY IF EXISTS "Server owners can update stickers" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload server sticker" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete server sticker" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update server sticker" ON storage.objects;

-- Create new secure policies for server-stickers
CREATE POLICY "Admins can upload server sticker"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'server-stickers' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.servers s
    WHERE s.id::text = (storage.foldername(name))[1]
    AND (
      s.owner_id = auth.uid() 
      OR s.secondary_owner_id = auth.uid()
      OR public.has_server_permission(auth.uid(), s.id, 'manage_server')
    )
  )
);

CREATE POLICY "Anyone can view server stickers"
ON storage.objects FOR SELECT
USING (bucket_id = 'server-stickers');

CREATE POLICY "Admins can update server sticker"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'server-stickers' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.servers s
    WHERE s.id::text = (storage.foldername(name))[1]
    AND (
      s.owner_id = auth.uid() 
      OR s.secondary_owner_id = auth.uid()
      OR public.has_server_permission(auth.uid(), s.id, 'manage_server')
    )
  )
);

CREATE POLICY "Admins can delete server sticker"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'server-stickers' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.servers s
    WHERE s.id::text = (storage.foldername(name))[1]
    AND (
      s.owner_id = auth.uid() 
      OR s.secondary_owner_id = auth.uid()
      OR public.has_server_permission(auth.uid(), s.id, 'manage_server')
    )
  )
);