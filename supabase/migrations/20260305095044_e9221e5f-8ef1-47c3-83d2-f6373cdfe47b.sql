-- Fix: allow both sender AND receiver to delete processed signals
DROP POLICY IF EXISTS "Users can delete their own signals" ON public.voice_signals;
CREATE POLICY "Users can delete their own or received signals"
  ON public.voice_signals
  FOR DELETE
  TO authenticated
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- Index for faster cleanup of stale signals
CREATE INDEX IF NOT EXISTS idx_voice_signals_created_at ON public.voice_signals (created_at);