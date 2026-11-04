-- ============================================================================
-- Apercu d'invitation "a la Discord" pour les cartes affichees dans le chat :
-- banniere, nombre de membres en ligne, date de creation et statut
-- Communaute en plus des champs de get_invite_details.
-- Publique comme get_invite_details (une invitation est faite pour etre lue).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_invite_preview(invite_code text)
RETURNS TABLE (
  server_id uuid,
  server_name text,
  server_icon_url text,
  server_banner_url text,
  server_description text,
  server_created_at timestamptz,
  member_count bigint,
  online_count bigint,
  community_enabled boolean,
  is_expired boolean,
  is_maxed boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.id,
    s.name,
    s.icon_url,
    s.banner_url,
    s.description,
    s.created_at,
    (SELECT COUNT(*) FROM server_members m WHERE m.server_id = s.id),
    (SELECT COUNT(*) FROM server_members m
       JOIN profiles p ON p.id = m.user_id
      WHERE m.server_id = s.id AND p.status IS NOT NULL AND p.status <> 'offline'),
    COALESCE((SELECT ss.community_enabled FROM server_settings ss WHERE ss.server_id = s.id), false),
    (i.expires_at IS NOT NULL AND i.expires_at < NOW()),
    (i.max_uses IS NOT NULL AND i.uses >= i.max_uses)
  FROM invites i
  JOIN servers s ON s.id = i.server_id
  WHERE i.code = invite_code
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_invite_preview(text) TO anon, authenticated;
