-- Create a separate table for private user data (phone number)
CREATE TABLE public.user_private_data (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_private_data ENABLE ROW LEVEL SECURITY;

-- Only the user can view their own private data
CREATE POLICY "Users can view own private data"
ON public.user_private_data
FOR SELECT
USING (auth.uid() = id);

-- Only the user can insert their own private data
CREATE POLICY "Users can insert own private data"
ON public.user_private_data
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Only the user can update their own private data
CREATE POLICY "Users can update own private data"
ON public.user_private_data
FOR UPDATE
USING (auth.uid() = id);

-- Migrate existing phone data from profiles to user_private_data
INSERT INTO public.user_private_data (id, phone)
SELECT id, phone FROM public.profiles WHERE phone IS NOT NULL
ON CONFLICT (id) DO UPDATE SET phone = EXCLUDED.phone;

-- Remove phone column from profiles table
ALTER TABLE public.profiles DROP COLUMN phone;