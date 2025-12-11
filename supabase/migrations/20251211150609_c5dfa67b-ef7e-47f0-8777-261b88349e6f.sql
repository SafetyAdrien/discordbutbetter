-- Create storage buckets for user and server assets
INSERT INTO storage.buckets (id, name, public) VALUES
  ('avatars', 'avatars', true),
  ('banners', 'banners', true),
  ('server-icons', 'server-icons', true),
  ('server-banners', 'server-banners', true),
  ('server-emojis', 'server-emojis', true),
  ('server-stickers', 'server-stickers', true);

-- Avatars bucket policies
CREATE POLICY "Avatars are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Banners bucket policies
CREATE POLICY "Banners are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'banners');

CREATE POLICY "Users can upload own banner"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'banners' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own banner"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'banners' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own banner"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'banners' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Server icons bucket policies
CREATE POLICY "Server icons are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'server-icons');

CREATE POLICY "Server owners can upload server icon"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'server-icons' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Server owners can update server icon"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'server-icons' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Server owners can delete server icon"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'server-icons' AND
    auth.uid() IS NOT NULL
  );

-- Server banners bucket policies
CREATE POLICY "Server banners are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'server-banners');

CREATE POLICY "Server owners can upload server banner"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'server-banners' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Server owners can update server banner"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'server-banners' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Server owners can delete server banner"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'server-banners' AND
    auth.uid() IS NOT NULL
  );

-- Server emojis bucket policies
CREATE POLICY "Server emojis are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'server-emojis');

CREATE POLICY "Authenticated users can upload server emoji"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'server-emojis' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Authenticated users can update server emoji"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'server-emojis' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Authenticated users can delete server emoji"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'server-emojis' AND
    auth.uid() IS NOT NULL
  );

-- Server stickers bucket policies
CREATE POLICY "Server stickers are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'server-stickers');

CREATE POLICY "Authenticated users can upload server sticker"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'server-stickers' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Authenticated users can update server sticker"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'server-stickers' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Authenticated users can delete server sticker"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'server-stickers' AND
    auth.uid() IS NOT NULL
  );