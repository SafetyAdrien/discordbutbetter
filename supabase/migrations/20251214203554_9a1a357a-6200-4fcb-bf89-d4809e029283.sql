-- Add thread_id column to polls table for thread polls
ALTER TABLE polls ADD COLUMN thread_id uuid REFERENCES threads(id) ON DELETE CASCADE;