
-- Replace generate_invite_code with cryptographically secure version using gen_random_bytes
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  chars text := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result text := '';
  i integer;
  random_bytes bytea;
BEGIN
  -- Use cryptographically secure random bytes
  random_bytes := extensions.gen_random_bytes(10);
  FOR i IN 1..10 LOOP
    result := result || substr(chars, (get_byte(random_bytes, i - 1) % 62) + 1, 1);
  END LOOP;
  RETURN result;
END;
$$;
