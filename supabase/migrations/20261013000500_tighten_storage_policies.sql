-- Tighten the storage read policy.
--
-- "Authenticated users can read app buckets" granted ANY logged-in user read
-- access to server icons, banners, emojis, stickers, announcement banners and
-- role icons for EVERY server — including servers they are not a member of.
-- They could enumerate those objects directly against storage.objects.
--
-- Server-scoped assets are now only readable by members of the owning server.
-- The path layout is "<server_id>/<file>" for server-owned buckets, which is
-- what the predicate below relies on.

DROP POLICY IF EXISTS "Authenticated users can read app buckets" ON storage.objects;

-- Personal assets (avatar / banner) remain readable by any authenticated user.
CREATE POLICY "Authenticated users can read personal assets"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id IN ('avatars', 'banners'));

-- Server-scoped assets: first path segment is the server id.
-- is_server_member_uuid is a small wrapper that returns false instead of
-- raising: a cast of an arbitrary (possibly malformed) path segment to uuid
-- would abort the whole query rather than simply deny the row.
CREATE OR REPLACE FUNCTION public.is_server_member_uuid(_user_id uuid, _server_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT CASE
    WHEN _user_id IS NULL OR _server_id IS NULL THEN false
    ELSE public.is_server_member(_user_id, _server_id)
  END;
$$;

CREATE POLICY "Server members can read server assets"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id IN (
    'server-icons','server-banners','server-emojis','server-stickers',
    'announcement-banners','role-icons','channel-icons'
  )
  AND public.is_server_member_uuid(
    auth.uid(),
    NULLIF((storage.foldername(name))[1], '')::uuid
  )
);