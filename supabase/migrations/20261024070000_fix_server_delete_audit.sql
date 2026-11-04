-- Supprimer un serveur cascade sur ses salons, roles, emojis... dont les
-- triggers d'audit tentent d'ecrire un journal vers un serveur deja supprime
-- (violation de audit_logs_server_id_fkey). On ignore ces entrees.
CREATE OR REPLACE FUNCTION public._audit(_server_id uuid, _action_type text, _target_id uuid, _details jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR _server_id IS NULL THEN
    RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.servers WHERE id = _server_id) THEN
    RETURN;
  END IF;
  INSERT INTO public.audit_logs (server_id, actor_id, action_type, target_id, details)
  VALUES (_server_id, auth.uid(), _action_type, _target_id, COALESCE(_details, '{}'::jsonb));
END;
$function$;
