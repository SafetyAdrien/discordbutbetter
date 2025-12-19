-- Activer le realtime sur les tables de permissions
ALTER PUBLICATION supabase_realtime ADD TABLE public.roles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.role_permissions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.channel_permission_overrides;
ALTER PUBLICATION supabase_realtime ADD TABLE public.category_permission_overrides;