-- Update invite code generation to use Discord-style alphanumeric format (8 chars)
-- Characters: a-z, A-Z, 0-9 (62 possible characters per position)

-- Create a function to generate random alphanumeric codes
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  chars text := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * 62 + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$function$;

-- Update the default for new invites to use the new format
ALTER TABLE public.invites 
ALTER COLUMN code SET DEFAULT public.generate_invite_code();