-- Enable realtime for server_members table
ALTER TABLE public.server_members REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.server_members;