-- Preferences de notification par fil (menu "Rendre le fil muet" et "Parametres de notification").
-- Les reglages du fil (nom, mode lent, masquage apres inactivite, spoiler) existent deja sur `threads`
-- (colonnes slowmode_seconds, auto_archive_minutes, spoiler) et le mode lent est applique par le declencheur des forums.
ALTER TABLE public.thread_followers
  ADD COLUMN IF NOT EXISTS notification_level text NOT NULL DEFAULT 'all' CHECK (notification_level IN ('all', 'mentions', 'none')),
  ADD COLUMN IF NOT EXISTS muted_until timestamptz;
