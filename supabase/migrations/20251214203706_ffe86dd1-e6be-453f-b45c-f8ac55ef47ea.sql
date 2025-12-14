-- Drop existing insert policy and create updated one that supports threads
DROP POLICY IF EXISTS "Members can create polls" ON polls;

CREATE POLICY "Members can create polls" ON polls
  FOR INSERT
  WITH CHECK (
    auth.uid() = author_id AND (
      -- Channel polls (thread_id is null)
      (thread_id IS NULL AND EXISTS (
        SELECT 1 FROM channels c WHERE c.id = channel_id AND is_server_member(auth.uid(), c.server_id)
      ))
      OR
      -- Thread polls (thread_id is not null)
      (thread_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM threads t 
        JOIN channels c ON c.id = t.channel_id 
        WHERE t.id = thread_id AND is_server_member(auth.uid(), c.server_id)
      ))
    )
  );

-- Update view policy to include thread polls
DROP POLICY IF EXISTS "Members can view polls" ON polls;

CREATE POLICY "Members can view polls" ON polls
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM channels c WHERE c.id = channel_id AND is_server_member(auth.uid(), c.server_id)
    )
    OR
    EXISTS (
      SELECT 1 FROM threads t 
      JOIN channels c ON c.id = t.channel_id 
      WHERE t.id = thread_id AND is_server_member(auth.uid(), c.server_id)
    )
  );