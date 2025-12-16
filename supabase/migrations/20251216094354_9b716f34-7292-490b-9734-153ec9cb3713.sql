-- Add server_order column to profiles for user-specific server ordering
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS server_order uuid[] DEFAULT '{}'::uuid[];