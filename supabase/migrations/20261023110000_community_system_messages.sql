-- ============================================================================
-- Activation de la Communaute : comme Discord, deux messages systeme sont
-- publies dans le salon de mises a jour de la communaute :
--   [SYSTEM:COMMUNITY_ALERTS:<user_id>]  -> carte AutoMod "Alertes d'activite activees"
--   [SYSTEM:COMMUNITY_UPDATES]           -> message "Community Updates"
-- Le client se contente d'afficher ces jetons (ChatArea).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.trg_community_enabled_messages()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _channel uuid := COALESCE(NEW.updates_channel_id, NEW.safety_alerts_channel_id);
  _actor uuid := auth.uid();
BEGIN
  IF NEW.community_enabled IS TRUE
     AND (TG_OP = 'INSERT' OR COALESCE(OLD.community_enabled, false) IS FALSE)
     AND _channel IS NOT NULL THEN
    INSERT INTO public.messages (channel_id, author_id, content, is_system)
    VALUES
      (_channel, _actor, '[SYSTEM:COMMUNITY_ALERTS:' || COALESCE(_actor::text, '') || ']', true),
      (_channel, _actor, '[SYSTEM:COMMUNITY_UPDATES]', true);
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.trg_community_enabled_messages() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS community_enabled_messages ON public.server_settings;
CREATE TRIGGER community_enabled_messages
  AFTER INSERT OR UPDATE OF community_enabled ON public.server_settings
  FOR EACH ROW EXECUTE FUNCTION public.trg_community_enabled_messages();
