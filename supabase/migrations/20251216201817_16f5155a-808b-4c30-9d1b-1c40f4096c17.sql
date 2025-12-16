-- Fix storage policies for server-icons bucket
DROP POLICY IF EXISTS "Anyone can view server icons" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload server icons" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own server icons" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own server icons" ON storage.objects;

CREATE POLICY "Anyone can view server icons"
ON storage.objects FOR SELECT
USING (bucket_id = 'server-icons');

CREATE POLICY "Authenticated users can upload server icons"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'server-icons' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update server icons"
ON storage.objects FOR UPDATE
USING (bucket_id = 'server-icons' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete server icons"
ON storage.objects FOR DELETE
USING (bucket_id = 'server-icons' AND auth.uid() IS NOT NULL);

-- Fix storage policies for server-banners bucket
DROP POLICY IF EXISTS "Anyone can view server banners" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload server banners" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own server banners" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own server banners" ON storage.objects;

CREATE POLICY "Anyone can view server banners"
ON storage.objects FOR SELECT
USING (bucket_id = 'server-banners');

CREATE POLICY "Authenticated users can upload server banners"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'server-banners' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update server banners"
ON storage.objects FOR UPDATE
USING (bucket_id = 'server-banners' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete server banners"
ON storage.objects FOR DELETE
USING (bucket_id = 'server-banners' AND auth.uid() IS NOT NULL);