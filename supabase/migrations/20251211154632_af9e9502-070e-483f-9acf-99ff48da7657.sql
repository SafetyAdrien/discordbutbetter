-- Add UPDATE policy for DM message authors
CREATE POLICY "Authors can edit their dm messages" 
ON public.dm_messages 
FOR UPDATE 
USING (auth.uid() = author_id);

-- Add DELETE policy for DM message authors
CREATE POLICY "Authors can delete their dm messages" 
ON public.dm_messages 
FOR DELETE 
USING (auth.uid() = author_id);