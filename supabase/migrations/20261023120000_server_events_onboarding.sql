-- ============================================================================
-- Video "Evenements / Guide du serveur / Processus d'accueil" (Discord 2025)
--
--  1. Evenements de serveur : emplacement (salon de conference, salon vocal,
--     ailleurs), recurrence, image de couverture, occurrences annulees,
--     personnes interessees (avec occurrences ignorees).
--  2. Processus d'accueil : salons par defaut, questions, guide du serveur.
--  3. Reglages de securite supplementaires (protection MP/spams, permissions).
--  4. Profil du serveur : banniere predefinie et particularites.
--  5. Methode d'adhesion d'un membre (code d'invitation utilise).
--  6. Salons suivis dans "Chercher des salons" (salons masques par membre).
-- ============================================================================

-- ---------------------------------------------------------------- 1. events --
CREATE TABLE IF NOT EXISTS public.server_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id uuid NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  creator_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 100),
  description text CHECK (description IS NULL OR char_length(description) <= 1000),
  location_type text NOT NULL CHECK (location_type IN ('stage', 'voice', 'external')),
  channel_id uuid REFERENCES public.channels(id) ON DELETE SET NULL,
  location text CHECK (location IS NULL OR char_length(location) <= 100),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  recurrence text NOT NULL DEFAULT 'none'
    CHECK (recurrence IN ('none', 'weekly', 'biweekly', 'monthly_nth', 'yearly', 'daily', 'weekdays')),
  cover_url text,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'completed', 'canceled')),
  -- Debut des occurrences annulees ("Annuler cet evenement")
  canceled_occurrences timestamptz[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (location_type <> 'external' OR location IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS server_events_server_idx ON public.server_events (server_id, starts_at);

CREATE TABLE IF NOT EXISTS public.server_event_interests (
  event_id uuid NOT NULL REFERENCES public.server_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- "Je ne suis pas interesse(e) par... uniquement cet evenement"
  skipped_occurrences timestamptz[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);

ALTER TABLE public.server_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.server_event_interests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read server events" ON public.server_events;
CREATE POLICY "Members read server events" ON public.server_events
  FOR SELECT USING (public.is_server_member(auth.uid(), server_id));

DROP POLICY IF EXISTS "Event creators create events" ON public.server_events;
CREATE POLICY "Event creators create events" ON public.server_events
  FOR INSERT WITH CHECK (
    creator_id = auth.uid()
    AND (public.has_server_permission(auth.uid(), server_id, 'create_events')
         OR public.is_server_owner_or_secondary(auth.uid(), server_id))
  );

DROP POLICY IF EXISTS "Creators and moderators edit events" ON public.server_events;
CREATE POLICY "Creators and moderators edit events" ON public.server_events
  FOR UPDATE USING (
    creator_id = auth.uid()
    OR public.has_server_permission(auth.uid(), server_id, 'edit_events')
    OR public.has_server_permission(auth.uid(), server_id, 'moderate_events')
    OR public.is_server_owner_or_secondary(auth.uid(), server_id)
  );

DROP POLICY IF EXISTS "Creators and moderators delete events" ON public.server_events;
CREATE POLICY "Creators and moderators delete events" ON public.server_events
  FOR DELETE USING (
    creator_id = auth.uid()
    OR public.has_server_permission(auth.uid(), server_id, 'delete_events')
    OR public.has_server_permission(auth.uid(), server_id, 'moderate_events')
    OR public.is_server_owner_or_secondary(auth.uid(), server_id)
  );

DROP POLICY IF EXISTS "Members read event interests" ON public.server_event_interests;
CREATE POLICY "Members read event interests" ON public.server_event_interests
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.server_events e
    WHERE e.id = event_id AND public.is_server_member(auth.uid(), e.server_id)
  ));

DROP POLICY IF EXISTS "Members manage own interest" ON public.server_event_interests;
CREATE POLICY "Members manage own interest" ON public.server_event_interests
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.server_events e
    WHERE e.id = event_id AND public.is_server_member(auth.uid(), e.server_id)
  ));

CREATE OR REPLACE FUNCTION public.touch_server_event()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.touch_server_event() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS touch_server_event ON public.server_events;
CREATE TRIGGER touch_server_event BEFORE UPDATE ON public.server_events
  FOR EACH ROW EXECUTE FUNCTION public.touch_server_event();

-- Le createur est automatiquement interesse, comme sur Discord.
CREATE OR REPLACE FUNCTION public.server_event_creator_interest()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.creator_id IS NOT NULL THEN
    INSERT INTO public.server_event_interests (event_id, user_id)
    VALUES (NEW.id, NEW.creator_id) ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.server_event_creator_interest() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS server_event_creator_interest ON public.server_events;
CREATE TRIGGER server_event_creator_interest AFTER INSERT ON public.server_events
  FOR EACH ROW EXECUTE FUNCTION public.server_event_creator_interest();

ALTER TABLE public.server_events REPLICA IDENTITY FULL;
ALTER TABLE public.server_event_interests REPLICA IDENTITY FULL;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.server_events;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.server_event_interests;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Images de couverture : <server_id>/<fichier>
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-covers', 'event-covers', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Event covers are public" ON storage.objects;
CREATE POLICY "Event covers are public" ON storage.objects
  FOR SELECT USING (bucket_id = 'event-covers');

DROP POLICY IF EXISTS "Event creators upload covers" ON storage.objects;
CREATE POLICY "Event creators upload covers" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'event-covers'
    AND (public.has_server_permission(auth.uid(), (storage.foldername(name))[1]::uuid, 'create_events')
         OR public.is_server_owner_or_secondary(auth.uid(), (storage.foldername(name))[1]::uuid))
  );

DROP POLICY IF EXISTS "Event creators delete covers" ON storage.objects;
CREATE POLICY "Event creators delete covers" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'event-covers'
    AND (owner = auth.uid()
         OR public.is_server_owner_or_secondary(auth.uid(), (storage.foldername(name))[1]::uuid))
  );

-- ------------------------------------------------------------ 2. onboarding --
CREATE TABLE IF NOT EXISTS public.server_onboarding (
  server_id uuid PRIMARY KEY REFERENCES public.servers(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  default_channel_ids uuid[] NOT NULL DEFAULT '{}',
  -- [{id, title, required, multiple, pre_join, options:[{id, title, description, emoji, channel_ids, role_ids}]}]
  prompts jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- {welcome: text, tasks: [{id, title, channel_id, emoji}], resources: [{id, title, channel_id}]}
  guide jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.server_onboarding ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read onboarding" ON public.server_onboarding;
CREATE POLICY "Members read onboarding" ON public.server_onboarding
  FOR SELECT USING (public.is_server_member(auth.uid(), server_id));

DROP POLICY IF EXISTS "Managers write onboarding" ON public.server_onboarding;
CREATE POLICY "Managers write onboarding" ON public.server_onboarding
  FOR ALL USING (
    public.has_server_permission(auth.uid(), server_id, 'manage_server')
    OR public.is_server_owner_or_secondary(auth.uid(), server_id)
  ) WITH CHECK (
    public.has_server_permission(auth.uid(), server_id, 'manage_server')
    OR public.is_server_owner_or_secondary(auth.uid(), server_id)
  );

-- --------------------------------------------------- 3/4. server_settings --
ALTER TABLE public.server_settings
  ADD COLUMN IF NOT EXISTS hide_suspicious_dms boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS filter_unknown_dms boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS warn_external_links boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS hide_spammer_messages boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS require_mod_2fa boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS restrict_prune_to_admins boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS profile_banner_preset text,
  -- [{emoji, label}] (5 max)
  ADD COLUMN IF NOT EXISTS profile_traits jsonb NOT NULL DEFAULT '[]'::jsonb;

-- -------------------------------------------------------- 5. join method --
ALTER TABLE public.server_members
  ADD COLUMN IF NOT EXISTS joined_via_invite text;

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

  INSERT INTO public.server_members (server_id, user_id, joined_via_invite)
  VALUES (invite_record.server_id, auth.uid(), invite_record.code)
  RETURNING id INTO new_member_id;

  UPDATE public.invites SET uses = uses + 1 WHERE id = invite_record.id;

  RETURN invite_record.server_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.use_invite(text) FROM anon;

-- Date d'inscription des membres d'un serveur (colonne "A rejoint").
CREATE OR REPLACE FUNCTION public.get_server_member_accounts(_server_id uuid)
RETURNS TABLE (user_id uuid, account_created_at timestamptz, joined_via_invite text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sm.user_id, u.created_at, sm.joined_via_invite
  FROM public.server_members sm
  JOIN auth.users u ON u.id = sm.user_id
  WHERE sm.server_id = _server_id
    AND public.is_server_member(auth.uid(), _server_id);
$$;

REVOKE EXECUTE ON FUNCTION public.get_server_member_accounts(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_server_member_accounts(uuid) TO authenticated;

-- ------------------------------------------------ 6. "Chercher des salons" --
-- Salons que le membre a retires de sa liste (non suivis).
CREATE TABLE IF NOT EXISTS public.user_hidden_channels (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  server_id uuid NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, channel_id)
);

ALTER TABLE public.user_hidden_channels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own hidden channels" ON public.user_hidden_channels;
CREATE POLICY "Users manage own hidden channels" ON public.user_hidden_channels
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND public.is_server_member(auth.uid(), server_id));

-- "Derniere activite il y a ..." de la page Chercher des salons.
CREATE OR REPLACE FUNCTION public.get_channels_last_activity(_server_id uuid)
RETURNS TABLE (channel_id uuid, last_message_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, (SELECT max(m.created_at) FROM public.messages m WHERE m.channel_id = c.id)
  FROM public.channels c
  WHERE c.server_id = _server_id
    AND public.is_server_member(auth.uid(), _server_id)
    AND public.has_channel_permission(auth.uid(), c.id, 'view_channel');
$$;

REVOKE EXECUTE ON FUNCTION public.get_channels_last_activity(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_channels_last_activity(uuid) TO authenticated;

-- ------------------------------------------- processus d'accueil (membre) --
ALTER TABLE public.server_members
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

-- Le membre termine le processus d'accueil : les reponses choisies lui
-- donnent leurs roles, et seuls les salons par defaut + ceux des reponses
-- restent dans sa liste (les autres vont dans user_hidden_channels, il peut
-- les reprendre depuis "Chercher des salons").
CREATE OR REPLACE FUNCTION public.complete_server_onboarding(_server_id uuid, _option_ids text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _member_id uuid;
  _ob public.server_onboarding%ROWTYPE;
  _keep uuid[];
  _roles uuid[];
BEGIN
  SELECT id INTO _member_id FROM public.server_members WHERE server_id = _server_id AND user_id = _uid;
  IF _member_id IS NULL THEN
    RAISE EXCEPTION 'Not a member';
  END IF;

  SELECT * INTO _ob FROM public.server_onboarding WHERE server_id = _server_id;
  IF NOT FOUND OR NOT _ob.enabled THEN
    UPDATE public.server_members SET onboarding_completed_at = now() WHERE id = _member_id;
    RETURN;
  END IF;

  -- Options choisies (uniquement celles qui existent dans les questions)
  SELECT
    COALESCE(array_agg(DISTINCT ch::uuid) FILTER (WHERE ch IS NOT NULL), '{}'),
    COALESCE(array_agg(DISTINCT ro::uuid) FILTER (WHERE ro IS NOT NULL), '{}')
  INTO _keep, _roles
  FROM jsonb_array_elements(_ob.prompts) p,
       jsonb_array_elements(p -> 'options') o
       LEFT JOIN LATERAL jsonb_array_elements_text(COALESCE(o -> 'channel_ids', '[]'::jsonb)) ch ON true
       LEFT JOIN LATERAL jsonb_array_elements_text(COALESCE(o -> 'role_ids', '[]'::jsonb)) ro ON true
  WHERE o ->> 'id' = ANY(_option_ids);

  _keep := _keep || _ob.default_channel_ids;

  -- Roles des reponses (seulement des roles du serveur, jamais @everyone)
  INSERT INTO public.member_roles (member_id, role_id)
  SELECT _member_id, r.id FROM public.roles r
  WHERE r.server_id = _server_id AND r.id = ANY(_roles) AND NOT COALESCE(r.is_default, false)
  ON CONFLICT (member_id, role_id) DO NOTHING;

  -- Salons masques : tout ce qui n'est ni par defaut ni choisi
  IF array_length(_ob.default_channel_ids, 1) > 0 THEN
    INSERT INTO public.user_hidden_channels (user_id, server_id, channel_id)
    SELECT _uid, _server_id, c.id FROM public.channels c
    WHERE c.server_id = _server_id AND NOT (c.id = ANY(_keep))
    ON CONFLICT DO NOTHING;
  END IF;

  UPDATE public.server_members SET onboarding_completed_at = now() WHERE id = _member_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.complete_server_onboarding(uuid, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_server_onboarding(uuid, text[]) TO authenticated;

-- Les membres deja presents ne repassent pas par l'accueil.
UPDATE public.server_members SET onboarding_completed_at = COALESCE(joined_at, now())
WHERE onboarding_completed_at IS NULL;
