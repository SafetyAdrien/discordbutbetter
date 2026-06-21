
CREATE TYPE public.app_role AS ENUM ('app_admin');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_app_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_app_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.has_app_role(auth.uid(), 'app_admin') $$;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'app_admin'::public.app_role FROM auth.users
ORDER BY created_at ASC LIMIT 1
ON CONFLICT DO NOTHING;

CREATE TABLE public.badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  icon_url text,
  color text NOT NULL DEFAULT '#5865F2',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.badges TO anon, authenticated;
GRANT ALL ON public.badges TO service_role;

ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Badges are publicly readable"
ON public.badges FOR SELECT TO anon, authenticated USING (true);

CREATE TRIGGER badges_updated_at
BEFORE UPDATE ON public.badges
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  badge_id uuid REFERENCES public.badges(id) ON DELETE CASCADE NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (user_id, badge_id)
);

GRANT SELECT ON public.user_badges TO authenticated;
GRANT ALL ON public.user_badges TO service_role;

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User badges are readable by authenticated users"
ON public.user_badges FOR SELECT TO authenticated USING (true);

CREATE INDEX idx_user_badges_user_id ON public.user_badges(user_id);
CREATE INDEX idx_user_badges_badge_id ON public.user_badges(badge_id);

CREATE OR REPLACE FUNCTION public.upsert_badge(
  _id uuid, _key text, _name text, _description text,
  _icon_url text, _color text, _sort_order int
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _result_id uuid;
BEGIN
  IF NOT public.is_app_admin() THEN RAISE EXCEPTION 'Permission denied: app admin required'; END IF;
  IF _id IS NULL THEN
    INSERT INTO public.badges (key, name, description, icon_url, color, sort_order)
    VALUES (_key, _name, COALESCE(_description, ''), _icon_url, COALESCE(_color, '#5865F2'), COALESCE(_sort_order, 0))
    RETURNING id INTO _result_id;
  ELSE
    UPDATE public.badges
    SET key = _key, name = _name, description = COALESCE(_description, ''),
        icon_url = _icon_url, color = COALESCE(_color, '#5865F2'),
        sort_order = COALESCE(_sort_order, 0)
    WHERE id = _id
    RETURNING id INTO _result_id;
  END IF;
  RETURN _result_id;
END; $$;

CREATE OR REPLACE FUNCTION public.grant_badge(_user_id uuid, _badge_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_app_admin() THEN RAISE EXCEPTION 'Permission denied: app admin required'; END IF;
  INSERT INTO public.user_badges (user_id, badge_id, granted_by)
  VALUES (_user_id, _badge_id, auth.uid())
  ON CONFLICT (user_id, badge_id) DO NOTHING;
END; $$;

CREATE OR REPLACE FUNCTION public.revoke_badge(_user_id uuid, _badge_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_app_admin() THEN RAISE EXCEPTION 'Permission denied: app admin required'; END IF;
  DELETE FROM public.user_badges WHERE user_id = _user_id AND badge_id = _badge_id;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_search_profiles(_query text)
RETURNS TABLE(id uuid, username text, display_name text, avatar_url text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_app_admin() THEN RAISE EXCEPTION 'Permission denied: app admin required'; END IF;
  RETURN QUERY
  SELECT p.id, p.username, p.display_name, p.avatar_url
  FROM public.profiles p
  WHERE _query IS NOT NULL AND length(trim(_query)) > 0
    AND (LOWER(p.username) LIKE '%' || LOWER(trim(_query)) || '%'
      OR LOWER(COALESCE(p.display_name, '')) LIKE '%' || LOWER(trim(_query)) || '%')
  ORDER BY p.username LIMIT 20;
END; $$;

INSERT INTO public.badges (key, name, description, color, sort_order) VALUES
  ('staff', 'Staff', 'Membre officiel de l''équipe', '#5865F2', 10),
  ('moderator_alumni', 'Moderator Alumni', 'Ancien modérateur de la plateforme', '#9B59B6', 20),
  ('bug_hunter', 'Bug Hunter', 'A signalé des bugs vérifiés', '#3BA55C', 30),
  ('early_supporter', 'Early Supporter', 'A rejoint la plateforme à ses débuts', '#FF73FA', 40),
  ('active_developer', 'Active Developer', 'Développeur actif d''une application ou bot', '#1ABC9C', 50)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.badges REPLICA IDENTITY FULL;
ALTER TABLE public.user_badges REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.badges;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_badges;
