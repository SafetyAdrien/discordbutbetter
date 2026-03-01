
CREATE OR REPLACE FUNCTION public.enforce_lowercase_username()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.username := LOWER(NEW.username);
  RETURN NEW;
END;
$$;
