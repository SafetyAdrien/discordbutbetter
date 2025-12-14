-- Fix RLS policy for thread_followers to include WITH CHECK clause
DROP POLICY IF EXISTS "Users can manage own follows" ON public.thread_followers;

CREATE POLICY "Users can manage own follows"
ON public.thread_followers FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);