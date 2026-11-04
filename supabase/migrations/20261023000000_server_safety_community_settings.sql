-- Reglages issus des pages Discord "Acces", "Configuration de Securite",
-- "AutoMod" et "Communaute" des parametres du serveur.
--
-- Seuls les reglages que la base peut faire respecter sont appliques
-- (trigger sur les messages, use_invite). Les autres pages affichent leurs
-- options comme "Bientot disponible".

ALTER TABLE public.server_settings
  ADD COLUMN IF NOT EXISTS age_restricted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rules_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rules jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS verification_level text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS invites_paused_until timestamptz,
  ADD COLUMN IF NOT EXISTS community_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rules_channel_id uuid REFERENCES public.channels(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updates_channel_id uuid REFERENCES public.channels(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS safety_alerts_channel_id uuid REFERENCES public.channels(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS preferred_locale text NOT NULL DEFAULT 'fr',
  ADD COLUMN IF NOT EXISTS automod_rules jsonb NOT NULL DEFAULT
    '{"mention_spam":{"enabled":false,"limit":20},"custom":{"enabled":false,"keywords":[],"allow":[]}}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'server_settings_verification_level_check') THEN
    ALTER TABLE public.server_settings
      ADD CONSTRAINT server_settings_verification_level_check
      CHECK (verification_level IN ('none', 'low', 'medium', 'high'));
  END IF;
END $$;

-- Acceptation des regles du serveur ("Regles du serveur" de la page Acces).
CREATE TABLE IF NOT EXISTS public.server_rule_acceptances (
  server_id uuid NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (server_id, user_id)
);

ALTER TABLE public.server_rule_acceptances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read their own rule acceptance" ON public.server_rule_acceptances;
CREATE POLICY "Members read their own rule acceptance"
  ON public.server_rule_acceptances FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Members accept rules for themselves" ON public.server_rule_acceptances;
CREATE POLICY "Members accept rules for themselves"
  ON public.server_rule_acceptances FOR INSERT
  WITH CHECK (user_id = auth.uid() AND public.is_server_member(auth.uid(), server_id));

-- Garde-fous sur l'envoi de messages : regles, niveau de verification,
-- AutoMod (mentions, mots personnalises). Proprietaire et administrateurs
-- ne sont jamais bloques, comme sur Discord.
CREATE OR REPLACE FUNCTION public.enforce_server_message_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _server_id uuid;
  _owner_id uuid;
  _s public.server_settings%ROWTYPE;
  _member public.server_members%ROWTYPE;
  _has_role boolean;
  _user auth.users%ROWTYPE;
  _mentions integer;
  _limit integer;
  _kw text;
  _allowed text;
  _lower text;
BEGIN
  IF NEW.author_id IS NULL OR NEW.is_system THEN
    RETURN NEW;
  END IF;

  SELECT c.server_id, s.owner_id INTO _server_id, _owner_id
  FROM public.channels c JOIN public.servers s ON s.id = c.server_id
  WHERE c.id = NEW.channel_id;

  IF _server_id IS NULL OR NEW.author_id = _owner_id
     OR public.has_server_permission(NEW.author_id, _server_id, 'administrator') THEN
    RETURN NEW;
  END IF;

  SELECT * INTO _s FROM public.server_settings WHERE server_id = _server_id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Regles du serveur
  IF _s.rules_enabled AND NOT EXISTS (
    SELECT 1 FROM public.server_rule_acceptances
    WHERE server_id = _server_id AND user_id = NEW.author_id
  ) THEN
    RAISE EXCEPTION 'SERVER_RULES_NOT_ACCEPTED' USING ERRCODE = 'P0001';
  END IF;

  -- Niveau de verification (un membre qui a un role attribue n'est pas concerne)
  IF _s.verification_level <> 'none' THEN
    SELECT * INTO _member FROM public.server_members
    WHERE server_id = _server_id AND user_id = NEW.author_id;
    SELECT EXISTS (
      SELECT 1 FROM public.member_roles mr JOIN public.roles r ON r.id = mr.role_id
      WHERE mr.member_id = _member.id AND NOT COALESCE(r.is_default, false)
    ) INTO _has_role;

    IF NOT _has_role THEN
      SELECT * INTO _user FROM auth.users WHERE id = NEW.author_id;
      IF _user.email_confirmed_at IS NULL THEN
        RAISE EXCEPTION 'VERIFICATION_EMAIL_REQUIRED' USING ERRCODE = 'P0001';
      END IF;
      IF _s.verification_level IN ('medium', 'high')
         AND _user.created_at > now() - interval '5 minutes' THEN
        RAISE EXCEPTION 'VERIFICATION_ACCOUNT_TOO_NEW' USING ERRCODE = 'P0001';
      END IF;
      IF _s.verification_level = 'high'
         AND COALESCE(_member.joined_at, now()) > now() - interval '10 minutes' THEN
        RAISE EXCEPTION 'VERIFICATION_MEMBER_TOO_NEW' USING ERRCODE = 'P0001';
      END IF;
    END IF;
  END IF;

  -- AutoMod : spam de mentions
  IF COALESCE((_s.automod_rules -> 'mention_spam' ->> 'enabled')::boolean, false) THEN
    _limit := COALESCE((_s.automod_rules -> 'mention_spam' ->> 'limit')::integer, 20);
    SELECT count(*) INTO _mentions FROM regexp_matches(NEW.content, '<@[!&]?[^>]+>', 'g');
    IF _mentions > _limit THEN
      RAISE EXCEPTION 'AUTOMOD_MENTION_SPAM' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- AutoMod : mots personnalises (un mot autorise neutralise le blocage)
  IF COALESCE((_s.automod_rules -> 'custom' ->> 'enabled')::boolean, false) THEN
    _lower := lower(NEW.content);
    FOR _kw IN SELECT lower(trim(value)) FROM jsonb_array_elements_text(COALESCE(_s.automod_rules -> 'custom' -> 'keywords', '[]'::jsonb))
    LOOP
      CONTINUE WHEN _kw = '';
      IF position(_kw IN _lower) > 0 THEN
        SELECT value INTO _allowed
        FROM jsonb_array_elements_text(COALESCE(_s.automod_rules -> 'custom' -> 'allow', '[]'::jsonb))
        WHERE position(lower(trim(value)) IN _lower) > 0 AND position(_kw IN lower(trim(value))) > 0
        LIMIT 1;
        IF _allowed IS NULL THEN
          RAISE EXCEPTION 'AUTOMOD_KEYWORD_BLOCKED' USING ERRCODE = 'P0001';
        END IF;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_server_message_rules() FROM anon, authenticated, PUBLIC;

DROP TRIGGER IF EXISTS enforce_server_message_rules ON public.messages;
CREATE TRIGGER enforce_server_message_rules
  BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_server_message_rules();

-- Suspension des invitations ("Actions de cybersecurite").
CREATE OR REPLACE FUNCTION public.use_invite(invite_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite_record RECORD;
  new_member_id uuid;
  paused_until timestamptz;
BEGIN
  SELECT * INTO invite_record
  FROM public.invites
  WHERE code = invite_code;

  IF invite_record IS NULL THEN
    RAISE EXCEPTION 'Invite not found';
  END IF;

  IF invite_record.expires_at IS NOT NULL AND invite_record.expires_at < NOW() THEN
    RAISE EXCEPTION 'Invite has expired';
  END IF;

  IF invite_record.max_uses IS NOT NULL AND invite_record.uses >= invite_record.max_uses THEN
    RAISE EXCEPTION 'Invite has reached maximum uses';
  END IF;

  IF is_server_member(auth.uid(), invite_record.server_id) THEN
    RETURN invite_record.server_id;
  END IF;

  SELECT invites_paused_until INTO paused_until
  FROM public.server_settings WHERE server_id = invite_record.server_id;
  IF paused_until IS NOT NULL AND paused_until > NOW() THEN
    RAISE EXCEPTION 'Invites are paused';
  END IF;

  INSERT INTO public.server_members (server_id, user_id)
  VALUES (invite_record.server_id, auth.uid())
  RETURNING id INTO new_member_id;

  UPDATE public.invites SET uses = uses + 1 WHERE id = invite_record.id;

  RETURN invite_record.server_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.use_invite(text) FROM anon;
