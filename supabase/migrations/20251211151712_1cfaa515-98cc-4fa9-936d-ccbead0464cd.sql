-- Fix 1: Create secure function for DM conversation creation
CREATE OR REPLACE FUNCTION public.create_dm_conversation(p_other_user_id uuid DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_conv_id uuid;
  existing_conv_id uuid;
BEGIN
  -- Check if 1-on-1 conversation already exists
  IF p_other_user_id IS NOT NULL THEN
    SELECT dp1.conversation_id INTO existing_conv_id
    FROM dm_participants dp1
    JOIN dm_participants dp2 ON dp1.conversation_id = dp2.conversation_id
    JOIN dm_conversations dc ON dc.id = dp1.conversation_id
    WHERE dp1.user_id = auth.uid()
      AND dp2.user_id = p_other_user_id
      AND dc.is_group = false;
    
    IF existing_conv_id IS NOT NULL THEN
      RETURN existing_conv_id;
    END IF;
  END IF;

  -- Create new conversation
  INSERT INTO dm_conversations (is_group)
  VALUES (false)
  RETURNING id INTO new_conv_id;
  
  -- Add creator as participant
  INSERT INTO dm_participants (conversation_id, user_id)
  VALUES (new_conv_id, auth.uid());
  
  -- Add other user if specified
  IF p_other_user_id IS NOT NULL THEN
    INSERT INTO dm_participants (conversation_id, user_id)
    VALUES (new_conv_id, p_other_user_id);
  END IF;
  
  RETURN new_conv_id;
END;
$$;

-- Update RLS policy to prevent direct inserts
DROP POLICY IF EXISTS "Users can create conversations" ON dm_conversations;
CREATE POLICY "No direct conversation inserts" ON dm_conversations
  FOR INSERT WITH CHECK (false);

-- Fix 2: Add message content length constraints
ALTER TABLE messages
  ADD CONSTRAINT message_content_length
  CHECK (char_length(content) >= 1 AND char_length(content) <= 2000);

ALTER TABLE dm_messages
  ADD CONSTRAINT dm_message_content_length
  CHECK (char_length(content) >= 1 AND char_length(content) <= 2000);