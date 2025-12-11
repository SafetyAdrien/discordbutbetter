-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Create new policy requiring authentication
CREATE POLICY "Authenticated users can view profiles" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL);