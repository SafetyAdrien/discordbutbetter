-- Create function to check if users have actually exchanged messages in a DM
CREATE OR REPLACE FUNCTION public.has_dm_interaction(_user_id uuid, _other_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.dm_messages dm
    JOIN public.dm_participants dp1 ON dp1.conversation_id = dm.conversation_id
    JOIN public.dm_participants dp2 ON dp2.conversation_id = dm.conversation_id
    WHERE dp1.user_id = _user_id 
      AND dp2.user_id = _other_user_id
      AND dm.author_id = _other_user_id
  )
$$;

-- Drop the existing policy that uses shares_dm_with
DROP POLICY IF EXISTS "Users can view related profiles" ON public.profiles;

-- Create updated policy that requires actual message interaction for DM-based profile visibility
CREATE POLICY "Users can view related profiles" 
ON public.profiles 
FOR SELECT 
USING (
  (auth.uid() IS NOT NULL) AND (
    shares_server_with(auth.uid(), id) 
    OR is_friend_with(auth.uid(), id) 
    OR has_dm_interaction(auth.uid(), id)
  )
);