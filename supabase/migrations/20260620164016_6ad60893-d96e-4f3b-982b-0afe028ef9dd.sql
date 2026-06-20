
DROP POLICY IF EXISTS "Admins can manage server emojis" ON public.server_emojis;
CREATE POLICY "Owners or manage_emojis can manage server emojis"
ON public.server_emojis
FOR ALL
USING (
  public.is_server_owner(auth.uid(), server_id)
  OR public.has_server_permission(auth.uid(), server_id, 'manage_emojis'::server_permission)
  OR public.has_server_permission(auth.uid(), server_id, 'manage_server'::server_permission)
)
WITH CHECK (
  public.is_server_owner(auth.uid(), server_id)
  OR public.has_server_permission(auth.uid(), server_id, 'manage_emojis'::server_permission)
  OR public.has_server_permission(auth.uid(), server_id, 'manage_server'::server_permission)
);

DROP POLICY IF EXISTS "Admins can manage server stickers" ON public.server_stickers;
CREATE POLICY "Owners or manage_emojis can manage server stickers"
ON public.server_stickers
FOR ALL
USING (
  public.is_server_owner(auth.uid(), server_id)
  OR public.has_server_permission(auth.uid(), server_id, 'manage_emojis'::server_permission)
  OR public.has_server_permission(auth.uid(), server_id, 'manage_server'::server_permission)
)
WITH CHECK (
  public.is_server_owner(auth.uid(), server_id)
  OR public.has_server_permission(auth.uid(), server_id, 'manage_emojis'::server_permission)
  OR public.has_server_permission(auth.uid(), server_id, 'manage_server'::server_permission)
);
