-- MODULE 1: Add separate channel selectors for each event type in server_settings
ALTER TABLE public.server_settings 
ADD COLUMN IF NOT EXISTS sticker_channel_id uuid REFERENCES public.channels(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS boost_channel_id uuid REFERENCES public.channels(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS tips_channel_id uuid REFERENCES public.channels(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS activity_channel_id uuid REFERENCES public.channels(id) ON DELETE SET NULL;

-- MODULE 3: Add hoist option to roles for separate member grouping
ALTER TABLE public.roles 
ADD COLUMN IF NOT EXISTS hoist boolean DEFAULT false;

-- MODULE 4: Extended profile fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS pronouns text,
ADD COLUMN IF NOT EXISTS activity_type text,
ADD COLUMN IF NOT EXISTS activity_text text,
ADD COLUMN IF NOT EXISTS theme_color text,
ADD COLUMN IF NOT EXISTS theme_gradient text;

-- MODULE 2: User channel settings for mute/hide preferences
CREATE TABLE IF NOT EXISTS public.user_channel_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id uuid REFERENCES public.channels(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.categories(id) ON DELETE CASCADE,
  muted boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT user_channel_or_category CHECK (
    (channel_id IS NOT NULL AND category_id IS NULL) OR 
    (channel_id IS NULL AND category_id IS NOT NULL)
  ),
  UNIQUE(user_id, channel_id),
  UNIQUE(user_id, category_id)
);

-- Enable RLS on user_channel_settings
ALTER TABLE public.user_channel_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_channel_settings
CREATE POLICY "Users can manage their own channel settings"
ON public.user_channel_settings
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);