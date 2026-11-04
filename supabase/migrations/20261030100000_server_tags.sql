-- Tags de serveur : un tag par serveur (2 a 4 caracteres + badge pixel art + couleur), un tag actif par utilisateur.
-- Les ecritures passent exclusivement par des fonctions SECURITY DEFINER qui verifient permissions, appartenance,
-- concurrence (version attendue) et frequence de changement. Les tables ne sont lisibles qu'en lecture.

CREATE TABLE IF NOT EXISTS public.server_tag_badges (
  id text PRIMARY KEY CHECK (id ~ '^[a-z0-9_-]{1,40}$'),
  name text NOT NULL,
  asset_url text NOT NULL,
  category text NOT NULL,
  available boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.server_tag_badges (id, name, asset_url, category) VALUES
  ('leaf', 'Feuille', '/server-tag-badges/leaf.svg', 'essentials'),
  ('sword', 'Épée', '/server-tag-badges/sword.svg', 'essentials'),
  ('heart', 'Cœur', '/server-tag-badges/heart.svg', 'essentials'),
  ('flame', 'Flamme', '/server-tag-badges/flame.svg', 'essentials'),
  ('drop', 'Goutte', '/server-tag-badges/drop.svg', 'essentials'),
  ('skull', 'Crâne', '/server-tag-badges/skull.svg', 'essentials'),
  ('moon', 'Lune', '/server-tag-badges/moon.svg', 'essentials'),
  ('bolt', 'Éclair', '/server-tag-badges/bolt.svg', 'essentials'),
  ('gem', 'Gemme', '/server-tag-badges/gem.svg', 'essentials'),
  ('mushroom', 'Champignon', '/server-tag-badges/mushroom.svg', 'essentials'),
  ('planet', 'Planète', '/server-tag-badges/planet.svg', 'cosmos'),
  ('star', 'Étoile', '/server-tag-badges/star.svg', 'cosmos'),
  ('rocket', 'Fusée', '/server-tag-badges/rocket.svg', 'cosmos'),
  ('comet', 'Comète', '/server-tag-badges/comet.svg', 'cosmos'),
  ('ufo', 'Soucoupe', '/server-tag-badges/ufo.svg', 'cosmos'),
  ('sprout', 'Pousse', '/server-tag-badges/sprout.svg', 'treasures'),
  ('clover', 'Trèfle', '/server-tag-badges/clover.svg', 'treasures'),
  ('crown', 'Couronne', '/server-tag-badges/crown.svg', 'treasures'),
  ('trophy', 'Trophée', '/server-tag-badges/trophy.svg', 'treasures')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.server_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id uuid NOT NULL UNIQUE REFERENCES public.servers(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (name ~ '^[[:alnum:]]{2,4}$'),
  badge_id text NOT NULL REFERENCES public.server_tag_badges(id),
  color text CHECK (color IS NULL OR color ~ '^#[0-9A-Fa-f]{6}$'),
  enabled boolean NOT NULL DEFAULT true,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Un seul tag actif par utilisateur (cle primaire sur user_id).
CREATE TABLE IF NOT EXISTS public.user_server_tags (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  server_id uuid NOT NULL REFERENCES public.server_tags(server_id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  applied_version integer NOT NULL,
  selected_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS user_server_tags_server_idx ON public.user_server_tags (server_id);

ALTER TABLE public.server_tag_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.server_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_server_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "server_tag_badges readable" ON public.server_tag_badges;
CREATE POLICY "server_tag_badges readable" ON public.server_tag_badges FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "server_tags readable" ON public.server_tags;
CREATE POLICY "server_tags readable" ON public.server_tags FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "user_server_tags readable" ON public.user_server_tags;
CREATE POLICY "user_server_tags readable" ON public.user_server_tags FOR SELECT TO authenticated USING (true);
-- Aucune politique INSERT / UPDATE / DELETE : seules les fonctions ci-dessous ecrivent.

-- Delai minimum entre deux changements de tag d'un meme utilisateur (modifier ici pour le regler).
CREATE OR REPLACE FUNCTION public.server_tag_cooldown() RETURNS interval
LANGUAGE sql IMMUTABLE AS $$ SELECT interval '10 seconds' $$;

CREATE OR REPLACE FUNCTION public.upsert_server_tag(
  p_server_id uuid,
  p_name text,
  p_badge_id text,
  p_color text DEFAULT NULL,
  p_enabled boolean DEFAULT true,
  p_expected_version integer DEFAULT NULL
) RETURNS public.server_tags
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  cur public.server_tags;
  res public.server_tags;
  nm text := btrim(p_name);
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'server_tag_unauthenticated'; END IF;
  IF NOT (public.is_server_owner_or_secondary(uid, p_server_id)
          OR public.has_server_permission(uid, p_server_id, 'manage_server'::server_permission)) THEN
    RAISE EXCEPTION 'server_tag_forbidden';
  END IF;
  IF nm !~ '^[[:alnum:]]{2,4}$' THEN RAISE EXCEPTION 'server_tag_invalid_name'; END IF;
  IF p_color IS NOT NULL AND p_color !~ '^#[0-9A-Fa-f]{6}$' THEN RAISE EXCEPTION 'server_tag_invalid_color'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.server_tag_badges WHERE id = p_badge_id AND available) THEN
    RAISE EXCEPTION 'server_tag_invalid_badge';
  END IF;

  SELECT * INTO cur FROM public.server_tags WHERE server_id = p_server_id FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.server_tags (server_id, name, badge_id, color, enabled)
    VALUES (p_server_id, nm, p_badge_id, p_color, p_enabled)
    RETURNING * INTO res;
    RETURN res;
  END IF;

  IF p_expected_version IS NOT NULL AND p_expected_version <> cur.version THEN
    RAISE EXCEPTION 'server_tag_conflict';
  END IF;

  -- Modifier le nom, le badge ou la couleur impose aux membres de re-selectionner le tag.
  UPDATE public.server_tags SET
    name = nm,
    badge_id = p_badge_id,
    color = p_color,
    enabled = p_enabled,
    version = CASE WHEN cur.name IS DISTINCT FROM nm OR cur.badge_id IS DISTINCT FROM p_badge_id
                        OR cur.color IS DISTINCT FROM p_color THEN cur.version + 1 ELSE cur.version END,
    updated_at = now()
  WHERE server_id = p_server_id
  RETURNING * INTO res;
  RETURN res;
END $$;

CREATE OR REPLACE FUNCTION public.set_my_server_tag(p_server_id uuid)
RETURNS public.user_server_tags
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  tag public.server_tags;
  prev public.user_server_tags;
  res public.user_server_tags;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'server_tag_unauthenticated'; END IF;
  IF NOT public.is_server_member(uid, p_server_id) THEN RAISE EXCEPTION 'server_tag_not_member'; END IF;
  SELECT * INTO tag FROM public.server_tags WHERE server_id = p_server_id;
  IF NOT FOUND OR NOT tag.enabled THEN RAISE EXCEPTION 'server_tag_unavailable'; END IF;

  SELECT * INTO prev FROM public.user_server_tags WHERE user_id = uid FOR UPDATE;
  IF FOUND AND prev.server_id IS DISTINCT FROM p_server_id AND prev.selected_at > now() - public.server_tag_cooldown() THEN
    RAISE EXCEPTION 'server_tag_rate_limited';
  END IF;

  INSERT INTO public.user_server_tags (user_id, server_id, enabled, applied_version, selected_at)
  VALUES (uid, p_server_id, true, tag.version, now())
  ON CONFLICT (user_id) DO UPDATE
    SET server_id = EXCLUDED.server_id, enabled = true, applied_version = EXCLUDED.applied_version, selected_at = now()
  RETURNING * INTO res;
  RETURN res;
END $$;

CREATE OR REPLACE FUNCTION public.clear_my_server_tag() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'server_tag_unauthenticated'; END IF;
  DELETE FROM public.user_server_tags WHERE user_id = auth.uid();
END $$;

-- Quitter / etre expulse ou banni d'un serveur revoque le tag correspondant.
CREATE OR REPLACE FUNCTION public.revoke_server_tag_on_leave() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.user_server_tags WHERE user_id = OLD.user_id AND server_id = OLD.server_id;
  RETURN OLD;
END $$;
DROP TRIGGER IF EXISTS revoke_server_tag_on_leave ON public.server_members;
CREATE TRIGGER revoke_server_tag_on_leave AFTER DELETE ON public.server_members
  FOR EACH ROW EXECUTE FUNCTION public.revoke_server_tag_on_leave();

REVOKE ALL ON FUNCTION public.upsert_server_tag(uuid, text, text, text, boolean, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_my_server_tag(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.clear_my_server_tag() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_server_tag(uuid, text, text, text, boolean, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_my_server_tag(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clear_my_server_tag() TO authenticated;

-- Synchronisation temps reel entre sessions.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.server_tags; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.user_server_tags; EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;
