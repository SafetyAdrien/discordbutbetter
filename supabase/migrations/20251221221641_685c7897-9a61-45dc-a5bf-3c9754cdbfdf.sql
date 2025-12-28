-- Table pour les notes utilisateurs (privées à chaque utilisateur)
CREATE TABLE public.user_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  target_user_id UUID NOT NULL,
  content TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, target_user_id)
);

-- RLS pour user_notes
ALTER TABLE public.user_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notes"
  ON public.user_notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notes"
  ON public.user_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes"
  ON public.user_notes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes"
  ON public.user_notes FOR DELETE
  USING (auth.uid() = user_id);

-- Table pour les messages épinglés dans les DMs
CREATE TABLE public.dm_pinned_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES dm_messages(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES dm_conversations(id) ON DELETE CASCADE,
  pinned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  pinned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id)
);

-- RLS pour dm_pinned_messages
ALTER TABLE public.dm_pinned_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view pinned messages"
  ON public.dm_pinned_messages FOR SELECT
  USING (is_dm_participant(auth.uid(), conversation_id));

CREATE POLICY "Participants can pin messages"
  ON public.dm_pinned_messages FOR INSERT
  WITH CHECK (is_dm_participant(auth.uid(), conversation_id) AND auth.uid() = pinned_by);

CREATE POLICY "Participants can unpin messages"
  ON public.dm_pinned_messages FOR DELETE
  USING (is_dm_participant(auth.uid(), conversation_id));

-- Trigger pour updated_at sur user_notes
CREATE TRIGGER update_user_notes_updated_at
  BEFORE UPDATE ON public.user_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();