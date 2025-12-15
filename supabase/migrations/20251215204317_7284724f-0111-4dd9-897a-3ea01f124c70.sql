-- Table des notifications système pour serveurs
CREATE TABLE public.server_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  responded_at TIMESTAMPTZ
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_server_notifications_recipient ON public.server_notifications(recipient_id);
CREATE INDEX idx_server_notifications_server ON public.server_notifications(server_id);

-- Enable RLS
ALTER TABLE public.server_notifications ENABLE ROW LEVEL SECURITY;

-- Politique: utilisateurs peuvent voir leurs notifications
CREATE POLICY "Users can view their notifications"
ON public.server_notifications FOR SELECT
USING (auth.uid() = recipient_id);

-- Politique: propriétaires peuvent créer des notifications
CREATE POLICY "Owners can create notifications"
ON public.server_notifications FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM servers s 
    WHERE s.id = server_id 
    AND (s.owner_id = auth.uid() OR s.secondary_owner_id = auth.uid())
  )
);

-- Politique: destinataires peuvent mettre à jour
CREATE POLICY "Recipients can update notifications"
ON public.server_notifications FOR UPDATE
USING (auth.uid() = recipient_id);

-- Politique: destinataires peuvent supprimer leurs notifications lues
CREATE POLICY "Recipients can delete read notifications"
ON public.server_notifications FOR DELETE
USING (auth.uid() = recipient_id AND status IN ('read', 'accepted', 'rejected'));

-- Fonction: demande de suppression par second propriétaire
CREATE OR REPLACE FUNCTION public.request_server_deletion(_server_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_server RECORD;
  v_sender_name TEXT;
BEGIN
  SELECT * INTO v_server FROM servers WHERE id = _server_id;
  
  IF v_server.secondary_owner_id != auth.uid() THEN
    RAISE EXCEPTION 'Only secondary owner can request deletion';
  END IF;
  
  SELECT display_name INTO v_sender_name FROM profiles WHERE id = auth.uid();
  
  INSERT INTO server_notifications (
    server_id, recipient_id, sender_id, type, title, message
  ) VALUES (
    _server_id,
    v_server.owner_id,
    auth.uid(),
    'deletion_request',
    'Demande de suppression du serveur',
    '@' || v_sender_name || ' souhaite supprimer le serveur, acceptez-vous ?'
  );
  
  RETURN TRUE;
END;
$$;

-- Fonction: réponse à la demande de suppression
CREATE OR REPLACE FUNCTION public.respond_to_deletion_request(
  _notification_id UUID,
  _accept BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification RECORD;
BEGIN
  SELECT * INTO v_notification FROM server_notifications WHERE id = _notification_id;
  
  IF v_notification.recipient_id != auth.uid() THEN
    RAISE EXCEPTION 'Only recipient can respond';
  END IF;
  
  UPDATE server_notifications 
  SET status = CASE WHEN _accept THEN 'accepted' ELSE 'rejected' END,
      responded_at = now()
  WHERE id = _notification_id;
  
  IF _accept THEN
    DELETE FROM servers WHERE id = v_notification.server_id;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Fonction: suppression par propriétaire principal
CREATE OR REPLACE FUNCTION public.delete_server_as_owner(_server_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_server RECORD;
BEGIN
  SELECT * INTO v_server FROM servers WHERE id = _server_id;
  
  IF v_server.owner_id != auth.uid() THEN
    RAISE EXCEPTION 'Only owner can delete';
  END IF;
  
  IF v_server.secondary_owner_id IS NOT NULL THEN
    INSERT INTO server_notifications (
      server_id, recipient_id, sender_id, type, title, message, status
    ) VALUES (
      _server_id,
      v_server.secondary_owner_id,
      auth.uid(),
      'deletion_notice',
      'Suppression du serveur',
      'Le serveur va être supprimé par le propriétaire.',
      'read'
    );
  END IF;
  
  DELETE FROM servers WHERE id = _server_id;
  
  RETURN TRUE;
END;
$$;