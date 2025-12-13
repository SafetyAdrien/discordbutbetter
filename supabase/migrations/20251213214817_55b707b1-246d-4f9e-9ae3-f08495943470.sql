-- Add server mute/deafen columns to voice_states
ALTER TABLE voice_states 
ADD COLUMN IF NOT EXISTS server_muted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS server_deafened BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS muted_by UUID REFERENCES profiles(id);

-- Create voice_user_settings table for per-user volume control
CREATE TABLE IF NOT EXISTS voice_user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  volume SMALLINT DEFAULT 100 CHECK (volume >= 0 AND volume <= 200),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, target_user_id)
);

-- Enable RLS
ALTER TABLE voice_user_settings ENABLE ROW LEVEL SECURITY;

-- Users can manage their own voice settings
CREATE POLICY "Users can manage their voice settings"
ON voice_user_settings FOR ALL
USING (auth.uid() = user_id);

-- Create server mute function
CREATE OR REPLACE FUNCTION server_mute_participant(
  _channel_id UUID,
  _target_user_id UUID,
  _muted BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller has mute_members permission
  IF NOT (
    SELECT has_server_permission(auth.uid(), 
      (SELECT server_id FROM channels WHERE id = _channel_id), 
      'mute_members')
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  UPDATE voice_states 
  SET 
    server_muted = _muted,
    muted_by = CASE WHEN _muted THEN auth.uid() ELSE NULL END
  WHERE channel_id = _channel_id AND user_id = _target_user_id;
END;
$$;

-- Create server deafen function
CREATE OR REPLACE FUNCTION server_deafen_participant(
  _channel_id UUID,
  _target_user_id UUID,
  _deafened BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller has mute_members permission
  IF NOT (
    SELECT has_server_permission(auth.uid(), 
      (SELECT server_id FROM channels WHERE id = _channel_id), 
      'mute_members')
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  UPDATE voice_states 
  SET 
    server_deafened = _deafened,
    server_muted = CASE WHEN _deafened THEN true ELSE server_muted END,
    muted_by = CASE WHEN _deafened THEN auth.uid() ELSE muted_by END
  WHERE channel_id = _channel_id AND user_id = _target_user_id;
END;
$$;