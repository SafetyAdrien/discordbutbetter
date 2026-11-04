-- ============================================================================
-- Chargement des medias + modification du serveur depuis les parametres.
--
-- 1. Les buckets des visuels de serveur ont ete passes en prive
--    (20261013000400) alors que l'app enregistre et affiche partout des
--    liens publics (getPublicUrl -> /object/public/...). Un bucket prive
--    repond 400 sur ce chemin : icones de serveur, bannieres, icones de role,
--    emojis, autocollants, icones de salon et bannieres d'annonce ne
--    s'affichaient plus.
--    Ces visuels sont publics par nature (comme le CDN de Discord) : ils
--    apparaissent sur les cartes d'invitation et la Decouverte pour des
--    non-membres, et les emojis/autocollants sont vus sur d'autres serveurs.
--    Les chemins contiennent des UUID (non devinables) et le listage reste
--    protege par la politique SELECT de storage.objects (membres seulement).
--    Les pieces jointes (message-attachments) restent privees : l'app les
--    lit par liens signes, re-signes a l'affichage (src/lib/storageUrls.ts).
--
-- 2. Buckets utilises par l'app mais absents de cette instance (leurs
--    politiques existent deja) : server-sounds et channel-event-thumbnails.
--    Lus par liens signes : prives.
--
-- 3. Seul le proprietaire pouvait modifier un serveur, alors que les
--    parametres sont ouverts au co-proprietaire et a "Gerer le serveur" :
--    leurs modifications etaient ignorees sans erreur. La propriete du
--    serveur (owner_id / secondary_owner_id) reste reservee au proprietaire
--    (transfer_server_ownership / set_secondary_owner).
-- ============================================================================

-- 1. Visuels de serveur : publics
UPDATE storage.buckets
SET public = true
WHERE id IN (
  'server-icons',
  'server-banners',
  'server-emojis',
  'server-stickers',
  'announcement-banners',
  'role-icons',
  'channel-icons'
);

-- 2. Buckets manquants
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('server-sounds', 'server-sounds', false),
  ('channel-event-thumbnails', 'channel-event-thumbnails', false)
ON CONFLICT (id) DO NOTHING;

-- 3. Modification du serveur
DROP POLICY IF EXISTS "Server owners can update their servers" ON public.servers;
DROP POLICY IF EXISTS "Server managers can update their servers" ON public.servers;
CREATE POLICY "Server managers can update their servers" ON public.servers
  FOR UPDATE
  USING (
    auth.uid() = owner_id
    OR public.is_server_owner_or_secondary(auth.uid(), id)
    OR public.has_server_permission(auth.uid(), id, 'manage_server')
  )
  WITH CHECK (
    auth.uid() = owner_id
    OR public.is_server_owner_or_secondary(auth.uid(), id)
    OR public.has_server_permission(auth.uid(), id, 'manage_server')
  );

CREATE OR REPLACE FUNCTION public.guard_server_ownership_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Les fonctions SECURITY DEFINER (transfert, co-proprietaire) tournent
  -- sans utilisateur JWT different du proprietaire ; un appel direct par un
  -- non-proprietaire ne peut pas toucher a la propriete.
  IF (NEW.owner_id IS DISTINCT FROM OLD.owner_id OR NEW.secondary_owner_id IS DISTINCT FROM OLD.secondary_owner_id)
     AND auth.uid() IS NOT NULL
     AND auth.uid() IS DISTINCT FROM OLD.owner_id
     AND current_user = 'authenticated' THEN
    RAISE EXCEPTION 'Only the server owner can change ownership' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.guard_server_ownership_columns() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS guard_server_ownership_columns ON public.servers;
CREATE TRIGGER guard_server_ownership_columns
  BEFORE UPDATE ON public.servers
  FOR EACH ROW EXECUTE FUNCTION public.guard_server_ownership_columns();
