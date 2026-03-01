
-- 1. Corriger les usernames existants
UPDATE public.profiles
SET username = LOWER(username)
WHERE username <> LOWER(username);

-- 2. Créer un trigger pour forcer les minuscules à l'insertion/mise à jour
CREATE OR REPLACE FUNCTION public.enforce_lowercase_username()
RETURNS TRIGGER AS $$
BEGIN
  NEW.username := LOWER(NEW.username);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_lowercase_username
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_lowercase_username();
