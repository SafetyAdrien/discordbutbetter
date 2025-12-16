-- MODULE 1: Add separate channel selectors for each system message type
ALTER TABLE public.server_settings
ADD COLUMN IF NOT EXISTS sticker_channel_id uuid REFERENCES public.channels(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS boost_channel_id uuid REFERENCES public.channels(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS tips_channel_id uuid REFERENCES public.channels(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS activity_channel_id uuid REFERENCES public.channels(id) ON DELETE SET NULL;

-- MODULE 1: Add target_user_id to messages for system messages (welcome messages)
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS target_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- MODULE 3: Add 15 new permissions to the enum
-- Voice & Stage permissions
ALTER TYPE public.server_permission ADD VALUE IF NOT EXISTS 'stream';
ALTER TYPE public.server_permission ADD VALUE IF NOT EXISTS 'use_vad';
ALTER TYPE public.server_permission ADD VALUE IF NOT EXISTS 'priority_speaker';
ALTER TYPE public.server_permission ADD VALUE IF NOT EXISTS 'mute_members';
ALTER TYPE public.server_permission ADD VALUE IF NOT EXISTS 'deafen_members';
ALTER TYPE public.server_permission ADD VALUE IF NOT EXISTS 'move_members';
ALTER TYPE public.server_permission ADD VALUE IF NOT EXISTS 'request_to_speak';

-- Forum & Media permissions  
ALTER TYPE public.server_permission ADD VALUE IF NOT EXISTS 'send_posts';
ALTER TYPE public.server_permission ADD VALUE IF NOT EXISTS 'manage_threads';

-- Calendar & Tasks permissions
ALTER TYPE public.server_permission ADD VALUE IF NOT EXISTS 'manage_events';
ALTER TYPE public.server_permission ADD VALUE IF NOT EXISTS 'manage_tasks';

-- General permissions
ALTER TYPE public.server_permission ADD VALUE IF NOT EXISTS 'use_soundboard';
ALTER TYPE public.server_permission ADD VALUE IF NOT EXISTS 'use_external_stickers';

-- MODULE 1: Update RLS policy to allow target users to delete their welcome messages
DROP POLICY IF EXISTS "Target users can delete their welcome messages" ON public.messages;
CREATE POLICY "Target users can delete their welcome messages"
ON public.messages
FOR DELETE
USING (auth.uid() = target_user_id);