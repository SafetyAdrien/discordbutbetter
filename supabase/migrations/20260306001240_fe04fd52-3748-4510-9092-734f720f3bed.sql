CREATE POLICY "Authors can update their polls"
ON public.polls FOR UPDATE
USING (auth.uid() = author_id);