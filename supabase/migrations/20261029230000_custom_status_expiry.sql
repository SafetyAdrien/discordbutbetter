-- Statut personnalise : date d'effacement automatique ("Effacer apres" dans la fenetre
-- "Definir ton statut"). NULL = ne pas supprimer.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS custom_status_expires_at timestamptz;

CREATE OR REPLACE FUNCTION public.clear_expired_custom_status()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles
     SET custom_status = NULL,
         custom_status_expires_at = NULL
   WHERE custom_status_expires_at IS NOT NULL
     AND custom_status_expires_at <= now();
$$;

-- Nettoyage cote serveur toutes les minutes quand pg_cron est disponible (sinon le client
-- du proprietaire efface son statut a l'echeance).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule('clear-expired-custom-status', '* * * * *', 'select public.clear_expired_custom_status()');
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
