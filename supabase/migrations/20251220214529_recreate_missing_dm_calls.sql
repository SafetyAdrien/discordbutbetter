-- ================================================
-- TABLE: dm_calls (recreated — originally created outside
-- the versioned migration history on the previous Supabase
-- project; schema reconstructed from src/integrations/supabase/types.ts
-- and src/hooks/useDMCalls.ts)
-- ================================================
CREATE TABLE public.dm_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.dm_conversations(id) ON DELETE CASCADE NOT NULL,
  initiator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  call_type TEXT NOT NULL DEFAULT 'voice' CHECK (call_type IN ('voice', 'video')),
  status TEXT NOT NULL DEFAULT 'ringing' CHECK (status IN ('ringing', 'active', 'ended', 'declined')),
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.dm_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view dm calls" ON public.dm_calls
  FOR SELECT USING (public.is_dm_participant(auth.uid(), conversation_id));

CREATE POLICY "Participants can create dm calls" ON public.dm_calls
  FOR INSERT WITH CHECK (
    auth.uid() = initiator_id AND
    public.is_dm_participant(auth.uid(), conversation_id)
  );

CREATE POLICY "Participants can update dm calls" ON public.dm_calls
  FOR UPDATE USING (public.is_dm_participant(auth.uid(), conversation_id));

-- Enable realtime for dm_calls
ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_calls;
