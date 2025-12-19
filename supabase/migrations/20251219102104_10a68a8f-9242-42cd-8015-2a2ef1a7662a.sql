-- Create the message-attachments bucket for file uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-attachments', 'message-attachments', true);

-- Policy: Authenticated users can upload message attachments
CREATE POLICY "Authenticated users can upload message attachments" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'message-attachments' AND
  auth.role() = 'authenticated'
);

-- Policy: Anyone can view message attachments (public bucket)
CREATE POLICY "Anyone can view message attachments" ON storage.objects
FOR SELECT USING (bucket_id = 'message-attachments');

-- Policy: Users can delete their own attachments (folder structure: user_id/...)
CREATE POLICY "Users can delete their own attachments" ON storage.objects
FOR DELETE USING (
  bucket_id = 'message-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);