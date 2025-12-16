-- Add mute_until and notification_setting columns to user_channel_settings
ALTER TABLE public.user_channel_settings
ADD COLUMN IF NOT EXISTS mute_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS notification_setting TEXT DEFAULT 'default';

-- Add comment for notification_setting values
COMMENT ON COLUMN public.user_channel_settings.notification_setting IS 'Values: default, all, mentions, nothing';

-- Enable realtime for user_channel_settings table
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_channel_settings;