-- Authenticated clients call heartbeat_presence from the app to maintain presence.
-- The prior security cleanup revoked PUBLIC execution but did not grant it back
-- to authenticated, despite its comment saying that authenticated access remains.
REVOKE EXECUTE ON FUNCTION public.heartbeat_presence(boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.heartbeat_presence(boolean) TO authenticated;
