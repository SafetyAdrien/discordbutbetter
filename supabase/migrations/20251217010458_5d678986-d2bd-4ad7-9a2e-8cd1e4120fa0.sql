-- Enable REPLICA IDENTITY FULL for profiles table to ensure all column updates are broadcast
ALTER TABLE public.profiles REPLICA IDENTITY FULL;