-- Fix server-icons and server-banners storage policies
-- Allow authenticated users to upload before server exists

-- Drop old restrictive INSERT policies
DROP POLICY IF EXISTS "Server owners can upload server icon" ON storage.objects;
DROP POLICY IF EXISTS "Server owners can upload server banner" ON storage.objects;

-- Create new permissive INSERT policies for authenticated users
CREATE POLICY "Authenticated users can upload server icons"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'server-icons' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can upload server banners"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'server-banners' AND auth.uid() IS NOT NULL);