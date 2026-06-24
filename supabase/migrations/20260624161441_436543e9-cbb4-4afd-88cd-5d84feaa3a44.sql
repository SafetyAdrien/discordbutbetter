CREATE TABLE public.channel_calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  all_day boolean NOT NULL DEFAULT false,
  location_channel_id uuid REFERENCES public.channels(id) ON DELETE SET NULL,
  thumbnail_url text,
  reminder_minutes integer,
  color text NOT NULL DEFAULT '#5865F2',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX channel_calendar_events_channel_idx ON public.channel_calendar_events(channel_id, starts_at);
CREATE INDEX channel_calendar_events_range_idx ON public.channel_calendar_events(channel_id, starts_at, ends_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.channel_calendar_events TO authenticated;
GRANT ALL ON public.channel_calendar_events TO service_role;

ALTER TABLE public.channel_calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view channel events"
ON public.channel_calendar_events FOR SELECT
TO authenticated
USING (public.has_channel_permission(auth.uid(), channel_id, 'view_channel'::server_permission));

CREATE POLICY "Members with create_events can insert"
ON public.channel_calendar_events FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by
  AND (
    public.has_channel_permission(auth.uid(), channel_id, 'create_events'::server_permission)
    OR public.has_channel_permission(auth.uid(), channel_id, 'manage_events'::server_permission)
  )
);

CREATE POLICY "Creator or manager can update"
ON public.channel_calendar_events FOR UPDATE
TO authenticated
USING (
  auth.uid() = created_by
  OR public.has_channel_permission(auth.uid(), channel_id, 'manage_events'::server_permission)
)
WITH CHECK (
  auth.uid() = created_by
  OR public.has_channel_permission(auth.uid(), channel_id, 'manage_events'::server_permission)
);

CREATE POLICY "Creator or manager can delete"
ON public.channel_calendar_events FOR DELETE
TO authenticated
USING (
  auth.uid() = created_by
  OR public.has_channel_permission(auth.uid(), channel_id, 'manage_events'::server_permission)
);

CREATE TRIGGER trg_channel_calendar_events_updated_at
BEFORE UPDATE ON public.channel_calendar_events
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.channel_calendar_events;
ALTER TABLE public.channel_calendar_events REPLICA IDENTITY FULL;