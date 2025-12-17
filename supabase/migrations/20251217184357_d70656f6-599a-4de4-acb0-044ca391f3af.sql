-- Enable REPLICA IDENTITY FULL on member_roles for realtime updates
ALTER TABLE member_roles REPLICA IDENTITY FULL;

-- Add member_roles to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE member_roles;