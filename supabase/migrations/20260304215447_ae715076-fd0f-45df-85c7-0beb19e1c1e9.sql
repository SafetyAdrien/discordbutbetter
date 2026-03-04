
-- Drop the problematic self-referencing UPDATE policy
DROP POLICY IF EXISTS "Users can update own voice state restricted" ON public.voice_states;

-- Create simple UPDATE policy (no self-referencing subquery)
CREATE POLICY "Users can update own voice state"
ON public.voice_states
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create a BEFORE UPDATE trigger to protect server-only columns
CREATE OR REPLACE FUNCTION public.protect_voice_state_server_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If the row belongs to the current user, prevent them from modifying server-controlled columns
  -- These can only be changed via security definer functions (server_mute_participant, server_deafen_participant)
  IF auth.uid() = NEW.user_id THEN
    NEW.server_muted := OLD.server_muted;
    NEW.server_deafened := OLD.server_deafened;
    NEW.muted_by := OLD.muted_by;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_voice_state_server_cols
BEFORE UPDATE ON public.voice_states
FOR EACH ROW
EXECUTE FUNCTION public.protect_voice_state_server_columns();
