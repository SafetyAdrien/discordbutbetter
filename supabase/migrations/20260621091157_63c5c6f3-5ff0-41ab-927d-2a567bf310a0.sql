CREATE TABLE public.channel_read_states (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, channel_id)
);

CREATE INDEX idx_channel_read_states_user ON public.channel_read_states(user_id);
CREATE INDEX idx_channel_read_states_channel ON public.channel_read_states(channel_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.channel_read_states TO authenticated;
GRANT ALL ON public.channel_read_states TO service_role;

ALTER TABLE public.channel_read_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own channel read states"
  ON public.channel_read_states
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.channel_read_states REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.channel_read_states;