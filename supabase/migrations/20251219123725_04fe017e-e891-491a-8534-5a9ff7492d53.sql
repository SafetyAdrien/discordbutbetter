-- Create channel_summaries table to store AI-generated summaries
CREATE TABLE public.channel_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  message_count INTEGER DEFAULT 0,
  start_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  end_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  participants TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create user_summary_reads to track which summaries users have read
CREATE TABLE public.user_summary_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  summary_id UUID NOT NULL REFERENCES channel_summaries(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, summary_id)
);

-- Enable RLS
ALTER TABLE public.channel_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_summary_reads ENABLE ROW LEVEL SECURITY;

-- Policies for channel_summaries
CREATE POLICY "Members can view channel summaries"
ON public.channel_summaries
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM channels c
  WHERE c.id = channel_summaries.channel_id
  AND is_server_member(auth.uid(), c.server_id)
));

CREATE POLICY "System can create summaries"
ON public.channel_summaries
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM channels c
  WHERE c.id = channel_summaries.channel_id
  AND is_server_member(auth.uid(), c.server_id)
));

CREATE POLICY "Admins can delete summaries"
ON public.channel_summaries
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM channels c
  WHERE c.id = channel_summaries.channel_id
  AND has_server_permission(auth.uid(), c.server_id, 'manage_channels'::server_permission)
));

-- Policies for user_summary_reads
CREATE POLICY "Users can manage own read states"
ON public.user_summary_reads
FOR ALL
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_channel_summaries_channel_id ON public.channel_summaries(channel_id);
CREATE INDEX idx_channel_summaries_created_at ON public.channel_summaries(created_at DESC);
CREATE INDEX idx_user_summary_reads_user_summary ON public.user_summary_reads(user_id, summary_id);