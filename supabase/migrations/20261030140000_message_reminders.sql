-- Rappels de messages ("Creer un rappel" dans le menu d'un message) : une ligne par rappel de l'utilisateur.
-- Une copie du message (auteur, texte, date, piece jointe) est gardee pour que le rappel reste lisible meme si
-- le message est supprime ou si on n'a plus acces au salon.
CREATE TABLE IF NOT EXISTS public.message_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'channel' CHECK (source IN ('channel', 'dm')),
  message_id uuid NOT NULL,
  channel_id uuid,
  conversation_id uuid,
  server_id uuid,
  thread_id uuid,
  remind_at timestamptz NOT NULL,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, message_id)
);
CREATE INDEX IF NOT EXISTS message_reminders_user_due_idx ON public.message_reminders (user_id, remind_at);

ALTER TABLE public.message_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reminders select own" ON public.message_reminders;
CREATE POLICY "reminders select own" ON public.message_reminders FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "reminders insert own" ON public.message_reminders;
CREATE POLICY "reminders insert own" ON public.message_reminders FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "reminders update own" ON public.message_reminders;
CREATE POLICY "reminders update own" ON public.message_reminders FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "reminders delete own" ON public.message_reminders;
CREATE POLICY "reminders delete own" ON public.message_reminders FOR DELETE TO authenticated USING (user_id = auth.uid());
