
-- 1) Table
CREATE TABLE public.server_connection_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id uuid NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('twitter','instagram','bluesky','youtube')),
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  min_posts integer,
  min_followers integer,
  min_account_age_days integer,
  require_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_scr_server ON public.server_connection_rules(server_id);
CREATE INDEX idx_scr_role ON public.server_connection_rules(role_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.server_connection_rules TO authenticated;
GRANT ALL ON public.server_connection_rules TO service_role;

ALTER TABLE public.server_connection_rules ENABLE ROW LEVEL SECURITY;

-- Members can view rules of their servers
CREATE POLICY "Members view server connection rules"
ON public.server_connection_rules FOR SELECT
TO authenticated
USING (public.is_server_member(auth.uid(), server_id));

-- Only managers can write
CREATE POLICY "Managers insert connection rules"
ON public.server_connection_rules FOR INSERT
TO authenticated
WITH CHECK (
  public.is_server_owner(auth.uid(), server_id)
  OR public.has_server_permission(auth.uid(), server_id, 'manage_roles'::server_permission)
);

CREATE POLICY "Managers update connection rules"
ON public.server_connection_rules FOR UPDATE
TO authenticated
USING (
  public.is_server_owner(auth.uid(), server_id)
  OR public.has_server_permission(auth.uid(), server_id, 'manage_roles'::server_permission)
)
WITH CHECK (
  public.is_server_owner(auth.uid(), server_id)
  OR public.has_server_permission(auth.uid(), server_id, 'manage_roles'::server_permission)
);

CREATE POLICY "Managers delete connection rules"
ON public.server_connection_rules FOR DELETE
TO authenticated
USING (
  public.is_server_owner(auth.uid(), server_id)
  OR public.has_server_permission(auth.uid(), server_id, 'manage_roles'::server_permission)
);

CREATE TRIGGER trg_scr_updated_at
BEFORE UPDATE ON public.server_connection_rules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Evaluator: assigns/removes target roles based on declared stats in profile.connections JSON
CREATE OR REPLACE FUNCTION public.evaluate_connection_rules(_user_id uuid, _server_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _connections jsonb;
  _member_id uuid;
  _rule record;
  _conn jsonb;
  _matches boolean;
  _posts integer;
  _followers integer;
  _is_verified boolean;
  _created_at timestamptz;
  _age_days integer;
BEGIN
  -- Must be a member of the server
  SELECT id INTO _member_id FROM public.server_members
   WHERE user_id = _user_id AND server_id = _server_id;
  IF _member_id IS NULL THEN
    RETURN;
  END IF;

  SELECT COALESCE(connections, '[]'::jsonb) INTO _connections
    FROM public.profiles WHERE id = _user_id;

  IF _connections IS NULL OR jsonb_typeof(_connections) <> 'array' THEN
    _connections := '[]'::jsonb;
  END IF;

  FOR _rule IN
    SELECT * FROM public.server_connection_rules WHERE server_id = _server_id
  LOOP
    _matches := false;

    -- Find first connection matching the rule's provider
    FOR _conn IN SELECT * FROM jsonb_array_elements(_connections)
    LOOP
      IF (_conn->>'provider') = _rule.provider THEN
        _posts := NULLIF(_conn#>>'{stats,posts_count}','')::int;
        _followers := NULLIF(_conn#>>'{stats,followers_count}','')::int;
        _is_verified := COALESCE((_conn#>>'{stats,is_verified}')::boolean, false);
        _created_at := NULLIF(_conn#>>'{stats,account_created_at}','')::timestamptz;
        _age_days := CASE WHEN _created_at IS NULL THEN NULL
                          ELSE EXTRACT(EPOCH FROM (now() - _created_at))::int / 86400 END;

        IF (_rule.min_posts IS NULL OR (_posts IS NOT NULL AND _posts >= _rule.min_posts))
           AND (_rule.min_followers IS NULL OR (_followers IS NOT NULL AND _followers >= _rule.min_followers))
           AND (_rule.min_account_age_days IS NULL OR (_age_days IS NOT NULL AND _age_days >= _rule.min_account_age_days))
           AND (NOT _rule.require_verified OR _is_verified) THEN
          _matches := true;
          EXIT;
        END IF;
      END IF;
    END LOOP;

    IF _matches THEN
      INSERT INTO public.member_roles (member_id, role_id)
      VALUES (_member_id, _rule.role_id)
      ON CONFLICT DO NOTHING;
    ELSE
      -- Only remove the role if it was assigned by a (now-unmet) rule.
      -- We keep manual assignments by removing only when NO rule for this role currently matches.
      DELETE FROM public.member_roles
       WHERE member_id = _member_id
         AND role_id = _rule.role_id
         AND NOT EXISTS (
           SELECT 1 FROM public.server_connection_rules r2
            WHERE r2.server_id = _server_id
              AND r2.role_id = _rule.role_id
              AND r2.id <> _rule.id
         );
    END IF;
  END LOOP;
END;
$$;

-- 3) Trigger on profiles.connections to re-evaluate on all servers the user belongs to
CREATE OR REPLACE FUNCTION public.trg_reevaluate_connection_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _sid uuid;
BEGIN
  IF TG_OP = 'UPDATE' AND COALESCE(NEW.connections::text, '') = COALESCE(OLD.connections::text, '') THEN
    RETURN NEW;
  END IF;

  FOR _sid IN SELECT server_id FROM public.server_members WHERE user_id = NEW.id
  LOOP
    PERFORM public.evaluate_connection_rules(NEW.id, _sid);
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profile_connections_reeval ON public.profiles;
CREATE TRIGGER trg_profile_connections_reeval
AFTER UPDATE OF connections ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.trg_reevaluate_connection_rules();

-- Also re-evaluate when a new rule is created/updated
CREATE OR REPLACE FUNCTION public.trg_reevaluate_rule_for_all_members()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid; _sid uuid;
BEGIN
  _sid := COALESCE(NEW.server_id, OLD.server_id);
  FOR _uid IN SELECT user_id FROM public.server_members WHERE server_id = _sid
  LOOP
    PERFORM public.evaluate_connection_rules(_uid, _sid);
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_scr_reeval ON public.server_connection_rules;
CREATE TRIGGER trg_scr_reeval
AFTER INSERT OR UPDATE OR DELETE ON public.server_connection_rules
FOR EACH ROW EXECUTE FUNCTION public.trg_reevaluate_rule_for_all_members();
