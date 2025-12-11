-- Create invites table for server invitations
CREATE TABLE public.invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id uuid NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  code text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(8), 'hex'),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  expires_at timestamptz,
  max_uses integer,
  uses integer DEFAULT 0,
  is_permanent boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view invites by code"
ON public.invites
FOR SELECT
USING (true);

CREATE POLICY "Members with permission can create invites"
ON public.invites
FOR INSERT
WITH CHECK (
  auth.uid() = created_by AND 
  (is_server_owner(auth.uid(), server_id) OR has_server_permission(auth.uid(), server_id, 'administrator'::server_permission))
);

CREATE POLICY "Admins can manage invites"
ON public.invites
FOR ALL
USING (is_server_owner(auth.uid(), server_id) OR has_server_permission(auth.uid(), server_id, 'administrator'::server_permission));

-- Function to use an invite
CREATE OR REPLACE FUNCTION public.use_invite(invite_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite_record RECORD;
  new_member_id uuid;
BEGIN
  -- Get the invite
  SELECT * INTO invite_record 
  FROM public.invites 
  WHERE code = invite_code;
  
  IF invite_record IS NULL THEN
    RAISE EXCEPTION 'Invite not found';
  END IF;
  
  -- Check if expired
  IF invite_record.expires_at IS NOT NULL AND invite_record.expires_at < NOW() THEN
    RAISE EXCEPTION 'Invite has expired';
  END IF;
  
  -- Check max uses
  IF invite_record.max_uses IS NOT NULL AND invite_record.uses >= invite_record.max_uses THEN
    RAISE EXCEPTION 'Invite has reached maximum uses';
  END IF;
  
  -- Check if already a member
  IF is_server_member(auth.uid(), invite_record.server_id) THEN
    RETURN invite_record.server_id;
  END IF;
  
  -- Add user to server
  INSERT INTO public.server_members (server_id, user_id)
  VALUES (invite_record.server_id, auth.uid())
  RETURNING id INTO new_member_id;
  
  -- Increment uses
  UPDATE public.invites SET uses = uses + 1 WHERE id = invite_record.id;
  
  RETURN invite_record.server_id;
END;
$$;