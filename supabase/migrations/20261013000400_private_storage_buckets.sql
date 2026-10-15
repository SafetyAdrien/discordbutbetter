-- `message-attachments` was created with public = true. A public bucket serves
-- objects over /storage/v1/object/public/<path> WITHOUT going through RLS, so
-- the carefully written SELECT policy on storage.objects (can_view_message_
-- attachment) was bypassed on that read path: any holder of a DM or private
-- channel attachment URL could fetch it anonymously.
--
-- Every read already goes through createSignedUrl, which works on private
-- buckets, so flipping this to private is safe and makes RLS effective.

UPDATE storage.buckets
SET public = false
WHERE id = 'message-attachments';

-- Same for the other asset buckets: their SELECT policy only checks
-- "is authenticated", not server membership, so making them public would let
-- anyone enumerate private server icons/emojis/stickers by URL.
UPDATE storage.buckets
SET public = false
WHERE id IN (
  'server-icons',
  'server-banners',
  'server-emojis',
  'server-stickers',
  'announcement-banners',
  'role-icons',
  'channel-icons'
);