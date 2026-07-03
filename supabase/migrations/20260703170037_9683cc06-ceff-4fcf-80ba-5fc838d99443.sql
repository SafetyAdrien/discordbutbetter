DROP POLICY IF EXISTS "Users can update friendship status" ON public.friendships;
CREATE POLICY "Only recipient can update friendship status"
ON public.friendships FOR UPDATE
USING (auth.uid() = friend_id)
WITH CHECK (auth.uid() = friend_id);