-- ============================================================================
-- Parametres utilisateur (video de reference "Parametres utilisateur").
--
-- 1. Table user_settings : un document jsonb par utilisateur (apparence,
--    accessibilite, voix, notifications, confidentialite...). Le client
--    fusionne avec ses valeurs par defaut (src/lib/userSettings.ts).
-- 2. Permissions de messagerie appliquees par la base :
--    - "Messages prives" : refuser les nouveaux MP des membres de serveurs
--      qui ne sont pas des amis (create_dm_conversation) ;
--    - "Autoriser les demandes d'ami de..." : Tout le monde / Amis d'amis /
--      Membres du serveur (trigger sur friendships).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own settings" ON public.user_settings;
CREATE POLICY "Users manage own settings" ON public.user_settings
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Lecture d'un booleen de reglage (valeur par defaut si absent), pour les
-- controles cote base. SECURITY DEFINER : lit les reglages d'un autre
-- utilisateur sans les exposer au client.
CREATE OR REPLACE FUNCTION public.user_setting_bool(_user_id uuid, _path text[], _default boolean)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT (settings #>> _path)::boolean FROM public.user_settings WHERE user_id = _user_id), _default);
$$;

REVOKE EXECUTE ON FUNCTION public.user_setting_bool(uuid, text[], boolean) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.are_friends(_a uuid, _b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE status = 'accepted'
      AND ((user_id = _a AND friend_id = _b) OR (user_id = _b AND friend_id = _a))
  );
$$;

REVOKE EXECUTE ON FUNCTION public.are_friends(uuid, uuid) FROM PUBLIC, anon;

-- ---------------------------------------------------------- demandes d'ami --
CREATE OR REPLACE FUNCTION public.enforce_friend_request_settings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _everyone boolean;
  _fof boolean;
  _members boolean;
BEGIN
  IF NEW.status IS DISTINCT FROM 'pending' THEN
    RETURN NEW;
  END IF;

  _everyone := public.user_setting_bool(NEW.friend_id, ARRAY['privacy','friend_requests','everyone'], true);
  IF _everyone THEN
    RETURN NEW;
  END IF;

  _fof := public.user_setting_bool(NEW.friend_id, ARRAY['privacy','friend_requests','friends_of_friends'], true);
  _members := public.user_setting_bool(NEW.friend_id, ARRAY['privacy','friend_requests','server_members'], true);

  IF _fof AND EXISTS (
    SELECT 1
    FROM public.friendships a
    JOIN public.friendships b ON b.status = 'accepted'
      AND (CASE WHEN a.user_id = NEW.user_id THEN a.friend_id ELSE a.user_id END)
          IN (b.user_id, b.friend_id)
      AND NEW.friend_id IN (b.user_id, b.friend_id)
    WHERE a.status = 'accepted' AND NEW.user_id IN (a.user_id, a.friend_id)
  ) THEN
    RETURN NEW;
  END IF;

  IF _members AND public.shares_server_with(NEW.user_id, NEW.friend_id) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'FRIEND_REQUESTS_NOT_ALLOWED' USING ERRCODE = 'P0001';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_friend_request_settings() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS enforce_friend_request_settings ON public.friendships;
CREATE TRIGGER enforce_friend_request_settings
  BEFORE INSERT ON public.friendships
  FOR EACH ROW EXECUTE FUNCTION public.enforce_friend_request_settings();

-- ------------------------------------------------------------- messages prives --
CREATE OR REPLACE FUNCTION public.create_dm_conversation(p_other_user_id uuid DEFAULT NULL::uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

    -- "Messages prives" desactive : seuls les amis peuvent ouvrir un MP.
    IF p_other_user_id <> auth.uid()
       AND NOT public.user_setting_bool(p_other_user_id, ARRAY['privacy','allow_server_dms'], true)
       AND NOT public.are_friends(auth.uid(), p_other_user_id) THEN
      RAISE EXCEPTION 'DM_NOT_ALLOWED' USING ERRCODE = 'P0001';
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
$function$;

REVOKE EXECUTE ON FUNCTION public.create_dm_conversation(uuid) FROM anon;
