-- Add new engagement settings fields to server_settings table
ALTER TABLE public.server_settings 
ADD COLUMN IF NOT EXISTS sticker_reply_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS boost_message_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS setup_tips_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS activity_feed_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS system_channel_id uuid REFERENCES public.channels(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_server_settings_system_channel ON public.server_settings(system_channel_id);