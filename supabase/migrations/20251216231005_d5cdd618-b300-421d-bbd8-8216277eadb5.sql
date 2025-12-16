-- Add description field to roles table
ALTER TABLE public.roles
ADD COLUMN IF NOT EXISTS description TEXT;