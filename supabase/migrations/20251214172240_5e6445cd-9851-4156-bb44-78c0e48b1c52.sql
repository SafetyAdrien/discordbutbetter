-- Add 'stage' to channel_type enum if it does not exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'channel_type' AND e.enumlabel = 'stage'
  ) THEN
    ALTER TYPE public.channel_type ADD VALUE 'stage';
  END IF;
END$$;