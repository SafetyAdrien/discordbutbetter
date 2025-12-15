-- Enable REPLICA IDENTITY FULL for messages table (required for DELETE events in Realtime)
ALTER TABLE public.messages REPLICA IDENTITY FULL;