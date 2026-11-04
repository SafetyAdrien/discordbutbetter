-- ============================================================================
-- Salons d'annonces (video de reference) :
--  1. Publication vers les salons abonnes par une RPC (avant : insertion
--     directe, refusee par RLS des que le salon cible etait sur un autre
--     serveur), avec les pieces jointes et le nom d'annonce de l'abonnement.
--  2. Modification / suppression du message d'origine repercutees sur les
--     copies publiees ("il sera mis a jour sur tous les serveurs abonnes").
--  3. Message systeme "X a ajoute <serveur> #<salon> dans ce salon" a chaque
--     abonnement (avant : insertion sans auteur, refusee).
--  4. Abonnements modifiables (nom de l'annonce, salon cible) depuis
--     Parametres du salon > Integrations > Salons suivis, par les membres
--     ayant "Gerer les webhooks" (ou administrateur).
-- ============================================================================

ALTER TABLE public.channel_followers
  ADD COLUMN IF NOT EXISTS display_name text CHECK (display_name IS NULL OR char_length(display_name) BETWEEN 1 AND 80);

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS source_channel_id uuid REFERENCES public.channels(id) ON DELETE SET NULL;

-- ------------------------------------------------------------ permissions --
DROP POLICY IF EXISTS "Admins can create channel followers" ON public.channel_followers;
CREATE POLICY "Webhook managers can create channel followers" ON public.channel_followers
  FOR INSERT WITH CHECK (
    auth.uid() = follower_user_id
    AND EXISTS (SELECT 1 FROM public.channels c
                WHERE c.id = target_channel_id
                  AND public.has_server_permission(auth.uid(), c.server_id, 'manage_webhooks'))
    AND EXISTS (SELECT 1 FROM public.channels s
                WHERE s.id = source_channel_id AND s.type = 'announcement'
                  AND public.has_channel_permission(auth.uid(), s.id, 'view_channel'))
  );

DROP POLICY IF EXISTS "Admins can delete channel followers" ON public.channel_followers;
DROP POLICY IF EXISTS "Webhook managers can delete channel followers" ON public.channel_followers;
CREATE POLICY "Webhook managers can delete channel followers" ON public.channel_followers
  FOR DELETE USING (EXISTS (SELECT 1 FROM public.channels c
                            WHERE c.id = target_channel_id
                              AND public.has_server_permission(auth.uid(), c.server_id, 'manage_webhooks')));

DROP POLICY IF EXISTS "Webhook managers can update channel followers" ON public.channel_followers;
CREATE POLICY "Webhook managers can update channel followers" ON public.channel_followers
  FOR UPDATE USING (EXISTS (SELECT 1 FROM public.channels c
                            WHERE c.id = target_channel_id
                              AND public.has_server_permission(auth.uid(), c.server_id, 'manage_webhooks')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.channels c
                      WHERE c.id = target_channel_id
                        AND public.has_server_permission(auth.uid(), c.server_id, 'manage_webhooks')));

-- --------------------------------------------- message systeme d'abonnement --
CREATE OR REPLACE FUNCTION public.trg_channel_followed_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.messages (channel_id, author_id, content, is_system)
  VALUES (NEW.target_channel_id, NEW.follower_user_id, '[SYSTEM:CHANNEL_FOLLOWED:' || NEW.source_channel_id::text || ']', true);
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.trg_channel_followed_message() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS channel_followed_message ON public.channel_followers;
CREATE TRIGGER channel_followed_message
  AFTER INSERT ON public.channel_followers
  FOR EACH ROW EXECUTE FUNCTION public.trg_channel_followed_message();

-- Infos publiques d'un salon d'annonces suivi (nom du serveur, icone, salon)
-- pour afficher le message systeme, meme sans etre membre du serveur source.
CREATE OR REPLACE FUNCTION public.get_followed_channel_info(_channel_id uuid)
RETURNS TABLE (channel_name text, server_id uuid, server_name text, server_icon_url text,
  server_banner_url text, server_description text, server_created_at timestamptz,
  member_count bigint, online_count bigint, is_member boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.name, s.id, s.name, s.icon_url, s.banner_url, s.description, s.created_at,
    (SELECT count(*) FROM public.server_members m WHERE m.server_id = s.id),
    (SELECT count(*) FROM public.server_members m JOIN public.profiles p ON p.id = m.user_id
      WHERE m.server_id = s.id AND p.status IS NOT NULL AND p.status <> 'offline'),
    public.is_server_member(auth.uid(), s.id)
  FROM public.channels c JOIN public.servers s ON s.id = c.server_id
  WHERE c.id = _channel_id AND c.type = 'announcement';
$$;
REVOKE EXECUTE ON FUNCTION public.get_followed_channel_info(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_followed_channel_info(uuid) TO authenticated;

-- --------------------------------------------------------------- publication --
CREATE OR REPLACE FUNCTION public.publish_announcement(_message_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _m public.messages%ROWTYPE;
  _c public.channels%ROWTYPE;
  _s public.servers%ROWTYPE;
  _count integer;
BEGIN
  SELECT * INTO _m FROM public.messages WHERE id = _message_id;
  IF NOT FOUND OR _m.is_system OR COALESCE(_m.is_published_message, false) THEN
    RAISE EXCEPTION 'MESSAGE_NOT_PUBLISHABLE';
  END IF;
  SELECT * INTO _c FROM public.channels WHERE id = _m.channel_id;
  IF _c.type IS DISTINCT FROM 'announcement' THEN
    RAISE EXCEPTION 'NOT_AN_ANNOUNCEMENT_CHANNEL';
  END IF;
  IF _m.author_id IS DISTINCT FROM auth.uid()
     AND NOT public.has_channel_permission(auth.uid(), _c.id, 'manage_messages') THEN
    RAISE EXCEPTION 'NOT_ALLOWED' USING ERRCODE = '42501';
  END IF;
  IF _m.published_at IS NOT NULL THEN
    RAISE EXCEPTION 'ALREADY_PUBLISHED';
  END IF;
  SELECT * INTO _s FROM public.servers WHERE id = _c.server_id;

  INSERT INTO public.messages (channel_id, author_id, content, attachments, source_server_id, source_channel_id,
    source_server_name, source_server_icon, source_channel_name, is_published_message, original_message_id)
  SELECT f.target_channel_id, _m.author_id, _m.content, _m.attachments, _s.id, _c.id,
    COALESCE(f.display_name, _s.name), _s.icon_url,
    CASE WHEN f.display_name IS NULL THEN _c.name ELSE NULL END,
    true, _m.id
  FROM public.channel_followers f
  WHERE f.source_channel_id = _c.id;
  GET DIAGNOSTICS _count = ROW_COUNT;

  UPDATE public.messages SET published_at = now(), publish_dismissed = true WHERE id = _m.id;
  RETURN _count;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.publish_announcement(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_announcement(uuid) TO authenticated;

-- ------------------------------------------- repercussion modif. / suppression --
CREATE OR REPLACE FUNCTION public.trg_sync_published_copies()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.messages WHERE original_message_id = OLD.id AND is_published_message;
    RETURN OLD;
  END IF;
  IF NEW.content IS DISTINCT FROM OLD.content OR NEW.attachments IS DISTINCT FROM OLD.attachments THEN
    UPDATE public.messages
    SET content = NEW.content, attachments = NEW.attachments, edited_at = COALESCE(NEW.edited_at, now())
    WHERE original_message_id = NEW.id AND is_published_message;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.trg_sync_published_copies() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS sync_published_copies_update ON public.messages;
CREATE TRIGGER sync_published_copies_update
  AFTER UPDATE OF content, attachments ON public.messages
  FOR EACH ROW WHEN (OLD.published_at IS NOT NULL)
  EXECUTE FUNCTION public.trg_sync_published_copies();

DROP TRIGGER IF EXISTS sync_published_copies_delete ON public.messages;
CREATE TRIGGER sync_published_copies_delete
  BEFORE DELETE ON public.messages
  FOR EACH ROW WHEN (OLD.published_at IS NOT NULL)
  EXECUTE FUNCTION public.trg_sync_published_copies();

-- --------------------------------- regles du serveur : ignorer les annonces --
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
  -- Les annonces publiees viennent d'un autre serveur : regles locales non applicables.
  IF NEW.author_id IS NULL OR NEW.is_system OR COALESCE(NEW.is_published_message, false) THEN
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
