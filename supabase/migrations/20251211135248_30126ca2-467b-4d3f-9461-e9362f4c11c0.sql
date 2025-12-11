-- Enable realtime for friendships only (dm_messages already enabled)
ALTER PUBLICATION supabase_realtime ADD TABLE friendships;