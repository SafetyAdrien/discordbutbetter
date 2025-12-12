-- Supprimer l'ancienne policy restrictive
DROP POLICY IF EXISTS "Admins can create announcements" ON announcements;

-- Créer une nouvelle policy plus permissive qui inclut les owners
CREATE POLICY "Members with permission can create announcements"
ON announcements FOR INSERT
WITH CHECK (
  auth.uid() = author_id AND
  EXISTS (
    SELECT 1 FROM channels c
    JOIN servers s ON c.server_id = s.id
    WHERE c.id = channel_id AND (
      s.owner_id = auth.uid() OR
      has_server_permission(auth.uid(), c.server_id, 'manage_channels')
    )
  )
);