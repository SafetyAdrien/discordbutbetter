-- Add secondary_owner_id column to servers table
ALTER TABLE public.servers 
ADD COLUMN IF NOT EXISTS secondary_owner_id uuid REFERENCES public.profiles(id) DEFAULT NULL;

-- Function to check if a user is a server owner or secondary owner
CREATE OR REPLACE FUNCTION public.is_server_owner_or_secondary(_user_id uuid, _server_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM servers
    WHERE id = _server_id 
    AND (owner_id = _user_id OR secondary_owner_id = _user_id)
  )
$$;

-- RPC function to set secondary owner (only primary owner can do this)
CREATE OR REPLACE FUNCTION public.set_secondary_owner(_server_id uuid, _user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify that the caller is the primary owner
  IF NOT EXISTS (SELECT 1 FROM servers WHERE id = _server_id AND owner_id = auth.uid()) THEN
    RAISE EXCEPTION 'Only the server owner can set a secondary owner';
  END IF;
  
  -- Verify that the user is a member of the server
  IF NOT EXISTS (SELECT 1 FROM server_members WHERE server_id = _server_id AND user_id = _user_id) THEN
    RAISE EXCEPTION 'User must be a member of the server';
  END IF;
  
  -- Cannot set primary owner as secondary owner
  IF EXISTS (SELECT 1 FROM servers WHERE id = _server_id AND owner_id = _user_id) THEN
    RAISE EXCEPTION 'Cannot set the primary owner as secondary owner';
  END IF;
  
  UPDATE servers SET secondary_owner_id = _user_id WHERE id = _server_id;
END
$$;

-- RPC function to remove secondary owner (only primary owner can do this)
CREATE OR REPLACE FUNCTION public.remove_secondary_owner(_server_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM servers WHERE id = _server_id AND owner_id = auth.uid()) THEN
    RAISE EXCEPTION 'Only the server owner can remove the secondary owner';
  END IF;
  
  UPDATE servers SET secondary_owner_id = NULL WHERE id = _server_id;
END
$$;