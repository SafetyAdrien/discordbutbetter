-- Create RPC function to transfer server ownership
CREATE OR REPLACE FUNCTION public.transfer_server_ownership(
  _server_id UUID,
  _new_owner_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current_owner_id UUID;
BEGIN
  -- Get current owner
  SELECT owner_id INTO _current_owner_id
  FROM servers
  WHERE id = _server_id;
  
  -- Verify the caller is the current owner
  IF _current_owner_id IS NULL THEN
    RAISE EXCEPTION 'Server not found';
  END IF;
  
  IF _current_owner_id != auth.uid() THEN
    RAISE EXCEPTION 'Only the current owner can transfer ownership';
  END IF;
  
  -- Verify new owner is a member of the server
  IF NOT EXISTS (
    SELECT 1 FROM server_members
    WHERE server_id = _server_id AND user_id = _new_owner_id
  ) THEN
    RAISE EXCEPTION 'New owner must be a member of the server';
  END IF;
  
  -- Cannot transfer to yourself
  IF _current_owner_id = _new_owner_id THEN
    RAISE EXCEPTION 'Cannot transfer ownership to yourself';
  END IF;
  
  -- Transfer ownership and clear secondary owner
  UPDATE servers
  SET 
    owner_id = _new_owner_id,
    secondary_owner_id = NULL,
    updated_at = now()
  WHERE id = _server_id;
  
  -- Log the action
  INSERT INTO audit_logs (server_id, actor_id, action_type, target_id, details)
  VALUES (
    _server_id,
    auth.uid(),
    'OWNERSHIP_TRANSFERRED',
    _new_owner_id,
    jsonb_build_object('previous_owner_id', _current_owner_id)
  );
END;
$$;