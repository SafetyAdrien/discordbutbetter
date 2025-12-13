-- Create storage bucket for role icons
INSERT INTO storage.buckets (id, name, public)
VALUES ('role-icons', 'role-icons', true)
ON CONFLICT (id) DO NOTHING;

-- Policy for uploading role icons (authenticated users only)
CREATE POLICY "Authenticated users can upload role icons"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'role-icons');

-- Policy for reading role icons (public)
CREATE POLICY "Anyone can view role icons"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'role-icons');

-- Policy for updating role icons
CREATE POLICY "Authenticated users can update role icons"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'role-icons');

-- Policy for deleting role icons
CREATE POLICY "Authenticated users can delete role icons"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'role-icons');