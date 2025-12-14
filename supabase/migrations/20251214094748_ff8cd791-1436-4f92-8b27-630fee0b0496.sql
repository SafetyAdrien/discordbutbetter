-- Add phone column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;

-- Create function to check username availability
CREATE OR REPLACE FUNCTION public.check_username_availability(p_username TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM profiles WHERE LOWER(username) = LOWER(p_username)
  );
$$;