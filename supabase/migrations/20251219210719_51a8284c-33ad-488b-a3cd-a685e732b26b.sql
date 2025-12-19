-- Allow users to leave servers by deleting their own membership
CREATE POLICY "Users can leave servers" 
ON public.server_members 
FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);