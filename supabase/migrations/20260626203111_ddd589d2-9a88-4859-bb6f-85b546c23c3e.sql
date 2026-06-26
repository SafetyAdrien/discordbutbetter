
ALTER TABLE public.download_permissions
  DROP CONSTRAINT download_permissions_owner_id_fkey,
  DROP CONSTRAINT download_permissions_allowed_user_id_fkey;

ALTER TABLE public.download_permissions
  ADD CONSTRAINT download_permissions_owner_id_fkey
    FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT download_permissions_allowed_user_id_fkey
    FOREIGN KEY (allowed_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
