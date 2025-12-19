-- Drop the existing check constraint that requires content
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS message_content_length;

-- Create a new constraint that allows empty content if the message could have attachments
-- We can't check jsonb in a simple check constraint, so we'll just allow empty content
-- RLS policies will ensure messages are valid
ALTER TABLE public.messages ADD CONSTRAINT message_content_or_attachments 
CHECK (length(content) > 0 OR attachments IS NOT NULL AND attachments != '[]'::jsonb);