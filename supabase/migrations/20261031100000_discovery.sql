-- Decouverte de serveurs et d'applications (page "Decouvrir").
--
-- * servers.discovery_category : categorie sous laquelle un serveur public (is_public = "Mode Decouverte")
--   apparait dans la Decouverte (Gaming, Musique, Divertissement, Science et technologie, Education).
-- * get_discovery_servers() : liste des serveurs publics avec leurs VRAIS compteurs (membres, en ligne),
--   lisible par tout utilisateur connecte meme s'il n'est pas membre (SECURITY DEFINER : la RLS de
--   server_members ne montre les membres qu'aux membres).
-- * discover_apps : annuaire d'applications gere par les administrateurs de l'app (is_app_admin) ;
--   lecture pour tout utilisateur connecte, ecriture reservee aux administrateurs.
-- Aucune donnee existante n'est modifiee ni supprimee.

ALTER TABLE public.servers
  ADD COLUMN IF NOT EXISTS discovery_category text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'servers_discovery_category_check') THEN
    ALTER TABLE public.servers
      ADD CONSTRAINT servers_discovery_category_check
      CHECK (discovery_category IS NULL OR discovery_category IN ('gaming', 'music', 'entertainment', 'science_tech', 'education'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS servers_discovery_idx ON public.servers (discovery_category) WHERE is_public;

CREATE OR REPLACE FUNCTION public.get_discovery_servers(_category text DEFAULT NULL, _query text DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  icon_url text,
  banner_url text,
  discovery_category text,
  member_count bigint,
  online_count bigint,
  created_at timestamptz,
  is_member boolean,
  is_community boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    s.id, s.name, s.description, s.icon_url, s.banner_url, s.discovery_category,
    (SELECT count(*) FROM public.server_members m WHERE m.server_id = s.id) AS member_count,
    (SELECT count(*) FROM public.server_members m
       JOIN public.profiles p ON p.id = m.user_id
      WHERE m.server_id = s.id AND coalesce(p.manual_status, p.status) IN ('online', 'idle', 'dnd')) AS online_count,
    s.created_at,
    EXISTS (SELECT 1 FROM public.server_members m WHERE m.server_id = s.id AND m.user_id = auth.uid()) AS is_member,
    coalesce((SELECT ss.community_enabled FROM public.server_settings ss WHERE ss.server_id = s.id), false) AS is_community
  FROM public.servers s
  WHERE s.is_public = true
    AND auth.uid() IS NOT NULL
    AND (_category IS NULL OR s.discovery_category = _category)
    AND (_query IS NULL OR _query = '' OR s.name ILIKE '%' || _query || '%' OR coalesce(s.description, '') ILIKE '%' || _query || '%')
  ORDER BY 7 DESC, 8 DESC, 2 ASC
  LIMIT 200;
$$;

REVOKE ALL ON FUNCTION public.get_discovery_servers(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_discovery_servers(text, text) TO authenticated;

CREATE TABLE IF NOT EXISTS public.discover_apps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  tagline text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  icon_url text,
  banner_url text,
  category text NOT NULL DEFAULT 'services'
    CHECK (category IN ('games', 'entertainment', 'moderation', 'social', 'services')),
  section text NOT NULL DEFAULT '',
  featured boolean NOT NULL DEFAULT false,
  server_count integer NOT NULL DEFAULT 0,
  languages text[] NOT NULL DEFAULT '{}',
  commands jsonb NOT NULL DEFAULT '[]'::jsonb,
  links jsonb NOT NULL DEFAULT '[]'::jsonb,
  gallery text[] NOT NULL DEFAULT '{}',
  published boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.discover_apps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view published apps" ON public.discover_apps;
CREATE POLICY "Authenticated can view published apps" ON public.discover_apps
  FOR SELECT TO authenticated USING (published OR public.is_app_admin());

DROP POLICY IF EXISTS "App admins manage apps" ON public.discover_apps;
CREATE POLICY "App admins manage apps" ON public.discover_apps
  FOR ALL TO authenticated USING (public.is_app_admin()) WITH CHECK (public.is_app_admin());

CREATE INDEX IF NOT EXISTS discover_apps_category_idx ON public.discover_apps (category, position);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.discover_apps TO authenticated;
