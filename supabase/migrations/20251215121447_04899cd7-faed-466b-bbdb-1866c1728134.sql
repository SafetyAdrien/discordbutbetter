-- Add edited_at column to dm_messages table
ALTER TABLE dm_messages ADD COLUMN edited_at TIMESTAMPTZ DEFAULT NULL;