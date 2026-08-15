-- ================================================
-- Server deletion request/approval flow — recreated.
-- These functions and the server_notifications table were
-- originally created outside the versioned migration history
-- on the previous Supabase project; reconstructed from
-- src/integrations/supabase/types.ts and the RPC call sites in
-- src/components/server-settings/ServerDeletePage.tsx and
-- src/hooks/useNotifications.ts.
-- ================================================

-- ================================================
-- TABLE: server_notifications
-- ================================================
CREATE TABLE IF NOT EXISTS public.server_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id uuid NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'read', 'accepted', 'rejected')),
  title text NOT NULL,
  message text NOT NULL,
  responded_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_server_notifications_recipient ON public.server_notifications(recipient_id, status);
CREATE INDEX IF NOT EXISTS idx_server_notifications_server ON public.server_notifications(server_id);

ALTER TABLE public.server_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recipients can view their notifications" ON public.server_notifications
  FOR SELECT USING (auth.uid() = recipient_id);

CREATE POLICY "Recipients can update their notifications" ON public.server_notifications
  FOR UPDATE USING (auth.uid() = recipient_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.server_notifications;

-- ================================================
-- FUNCTION: request_server_deletion
-- Called by a secondary owner to ask the primary owner to approve
-- deleting the server.
-- ================================================
CREATE OR REPLACE FUNCTION public.request_server_deletion(_server_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _owner_id UUID;
  _server_name TEXT;
BEGIN
  SELECT owner_id, name INTO _owner_id, _server_name
  FROM servers
  WHERE id = _server_id;

  IF _owner_id IS NULL THEN
    RAISE EXCEPTION 'Server not found';
  END IF;

  IF NOT is_server_owner_or_secondary(auth.uid(), _server_id) OR auth.uid() = _owner_id THEN
    RAISE EXCEPTION 'Only a secondary owner can request server deletion';
  END IF;

  INSERT INTO server_notifications (server_id, sender_id, recipient_id, type, status, title, message)
  VALUES (
    _server_id,
    auth.uid(),
    _owner_id,
    'server_deletion_request',
    'pending',
    'Demande de suppression de serveur',
    format('Le second propriétaire a demandé la suppression du serveur "%s".', _server_name)
  );

  RETURN true;
END;
$$;

-- ================================================
-- FUNCTION: delete_server_as_owner
-- Called directly by the primary owner to delete the server.
-- ================================================
CREATE OR REPLACE FUNCTION public.delete_server_as_owner(_server_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _owner_id UUID;
  _secondary_owner_id UUID;
  _server_name TEXT;
BEGIN
  SELECT owner_id, secondary_owner_id, name INTO _owner_id, _secondary_owner_id, _server_name
  FROM servers
  WHERE id = _server_id;

  IF _owner_id IS NULL THEN
    RAISE EXCEPTION 'Server not found';
  END IF;

  IF _owner_id != auth.uid() THEN
    RAISE EXCEPTION 'Only the server owner can delete the server';
  END IF;

  IF _secondary_owner_id IS NOT NULL THEN
    INSERT INTO server_notifications (server_id, sender_id, recipient_id, type, status, title, message, responded_at)
    VALUES (
      _server_id,
      auth.uid(),
      _secondary_owner_id,
      'server_deletion_request',
      'accepted',
      'Serveur supprimé',
      format('Le propriétaire a supprimé le serveur "%s".', _server_name),
      now()
    );
  END IF;

  DELETE FROM servers WHERE id = _server_id;

  RETURN true;
END;
$$;

-- ================================================
-- FUNCTION: respond_to_deletion_request
-- Called by the primary owner to accept or reject a pending
-- deletion request raised by the secondary owner.
-- ================================================
CREATE OR REPLACE FUNCTION public.respond_to_deletion_request(_notification_id UUID, _accept BOOLEAN)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _notification server_notifications%ROWTYPE;
BEGIN
  SELECT * INTO _notification
  FROM server_notifications
  WHERE id = _notification_id;

  IF _notification.id IS NULL THEN
    RAISE EXCEPTION 'Notification not found';
  END IF;

  IF _notification.recipient_id != auth.uid() THEN
    RAISE EXCEPTION 'Only the recipient can respond to this request';
  END IF;

  IF _notification.type != 'server_deletion_request' OR _notification.status != 'pending' THEN
    RAISE EXCEPTION 'This request is no longer pending';
  END IF;

  IF _accept THEN
    UPDATE server_notifications
    SET status = 'accepted', responded_at = now()
    WHERE id = _notification_id;

    DELETE FROM servers WHERE id = _notification.server_id;
  ELSE
    UPDATE server_notifications
    SET status = 'rejected', responded_at = now()
    WHERE id = _notification_id;
  END IF;

  RETURN true;
END;
$$;
