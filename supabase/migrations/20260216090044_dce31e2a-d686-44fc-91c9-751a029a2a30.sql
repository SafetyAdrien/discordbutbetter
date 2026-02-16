
-- Add icon_url column to channels
ALTER TABLE public.channels ADD COLUMN icon_url text;

-- Create channel-icons bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('channel-icons', 'channel-icons', true);

-- Public read
CREATE POLICY "Channel icons are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'channel-icons');

-- Authenticated upload
CREATE POLICY "Authenticated users can upload channel icons"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'channel-icons' AND auth.role() = 'authenticated');

-- Authenticated update
CREATE POLICY "Authenticated users can update channel icons"
ON storage.objects FOR UPDATE
USING (bucket_id = 'channel-icons' AND auth.role() = 'authenticated');

-- Authenticated delete
CREATE POLICY "Authenticated users can delete channel icons"
ON storage.objects FOR DELETE
USING (bucket_id = 'channel-icons' AND auth.role() = 'authenticated');
