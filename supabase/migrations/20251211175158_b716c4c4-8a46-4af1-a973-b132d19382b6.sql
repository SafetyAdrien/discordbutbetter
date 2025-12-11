-- Create typing_indicators table for real-time typing status
CREATE TABLE public.typing_indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel_id uuid REFERENCES public.channels(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.dm_conversations(id) ON DELETE CASCADE,
  started_at timestamptz DEFAULT now(),
  CONSTRAINT typing_context CHECK (
    (channel_id IS NOT NULL AND conversation_id IS NULL) OR 
    (channel_id IS NULL AND conversation_id IS NOT NULL)
  )
);

-- Indexes for frequent queries
CREATE INDEX idx_typing_channel ON public.typing_indicators(channel_id) WHERE channel_id IS NOT NULL;
CREATE INDEX idx_typing_conversation ON public.typing_indicators(conversation_id) WHERE conversation_id IS NOT NULL;
CREATE INDEX idx_typing_user ON public.typing_indicators(user_id);

-- Enable RLS
ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own typing indicators"
ON public.typing_indicators FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Members can view typing in their channels"
ON public.typing_indicators FOR SELECT
USING (
  (channel_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.channels c
    WHERE c.id = typing_indicators.channel_id
    AND public.is_server_member(auth.uid(), c.server_id)
  ))
  OR
  (conversation_id IS NOT NULL AND public.is_dm_participant(auth.uid(), conversation_id))
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_indicators;

-- Create voice_signals table for WebRTC signaling
CREATE TABLE public.voice_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  signal_type text NOT NULL CHECK (signal_type IN ('offer', 'answer', 'ice-candidate')),
  signal_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_voice_signals_to_user ON public.voice_signals(to_user_id, channel_id);
CREATE INDEX idx_voice_signals_channel ON public.voice_signals(channel_id);

-- Enable RLS
ALTER TABLE public.voice_signals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can send signals"
ON public.voice_signals FOR INSERT
WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Users can receive signals addressed to them"
ON public.voice_signals FOR SELECT
USING (auth.uid() = to_user_id OR auth.uid() = from_user_id);

CREATE POLICY "Users can delete their own signals"
ON public.voice_signals FOR DELETE
USING (auth.uid() = from_user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.voice_signals;

-- Function to cleanup old signals (called periodically or via trigger)
CREATE OR REPLACE FUNCTION public.cleanup_old_voice_signals()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.voice_signals WHERE created_at < NOW() - INTERVAL '30 seconds';
END;
$$;

-- Function to cleanup old typing indicators
CREATE OR REPLACE FUNCTION public.cleanup_old_typing_indicators()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.typing_indicators WHERE started_at < NOW() - INTERVAL '10 seconds';
END;
$$;