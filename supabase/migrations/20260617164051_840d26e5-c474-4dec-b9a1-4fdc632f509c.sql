
REVOKE EXECUTE ON FUNCTION public.evaluate_connection_rules(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.evaluate_connection_rules(uuid, uuid) TO authenticated, service_role;
