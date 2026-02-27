

# Implementing Media Channel Posts (Upload, Display, Realtime, Optimistic Updates)

## Problem
Media channel posts don't appear because:
1. `mediaItems` is hardcoded as an empty array (`[]`) on line 68 of `MediaChannel.tsx`
2. `handlePublish` only does `console.log` -- no actual upload or database save
3. There is no `media_posts` database table
4. There is no hook to fetch/create/sync media posts

## Solution

### 1. Create `media_posts` database table (migration)

```sql
CREATE TABLE public.media_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL,
  author_id uuid NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  file_url text NOT NULL,
  file_type text NOT NULL DEFAULT 'image',
  file_name text NOT NULL DEFAULT '',
  file_size bigint NOT NULL DEFAULT 0,
  alt_text text DEFAULT '',
  is_spoiler boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.media_posts ENABLE ROW LEVEL SECURITY;

-- Members can view media posts in their servers
CREATE POLICY "Members can view media posts"
  ON public.media_posts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM channels c
    WHERE c.id = media_posts.channel_id
    AND is_server_member(auth.uid(), c.server_id)
  ));

-- Members with permission can create media posts
CREATE POLICY "Members can create media posts"
  ON public.media_posts FOR INSERT
  WITH CHECK (
    auth.uid() = author_id
    AND EXISTS (
      SELECT 1 FROM channels c
      WHERE c.id = media_posts.channel_id
      AND is_server_member(auth.uid(), c.server_id)
    )
  );

-- Authors can delete their own posts
CREATE POLICY "Authors can delete their media posts"
  ON public.media_posts FOR DELETE
  USING (auth.uid() = author_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.media_posts;
```

### 2. Create `src/hooks/useMediaPosts.ts`

A new hook providing:
- **`useMediaPosts(channelId)`**: Fetches all media posts for a channel, sorted by `created_at DESC`. Includes a Realtime subscription on `media_posts` filtered client-side by `channel_id` for INSERT/DELETE events with `setQueryData` for instant UI updates.
- **`useCreateMediaPost()`**: A `useMutation` that:
  1. Uploads the file to the existing `message-attachments` storage bucket
  2. Gets the public URL
  3. Inserts a row into `media_posts`
  4. Uses **optimistic update** via `onMutate`: injects a temporary post (with local blob URL) into the cache immediately so the post appears before the upload completes
  5. On success: replaces the optimistic entry with the real data
  6. On error: rolls back the optimistic entry and shows a toast

### 3. Update `MediaChannel.tsx`

- Import and use `useMediaPosts(channel.id)` instead of the hardcoded empty array
- Import and use `useCreateMediaPost()` in `handlePublish` instead of `console.log`
- Pass the author profile data for the optimistic update
- Display media posts with title, description, author info, spoiler blur, and proper grid/list rendering
- Add a detail modal on click to view full-size media with metadata

### 4. Realtime sync details

- Subscribe to `media_posts` table via `postgres_changes` with `event: '*'`
- On `INSERT`: add to cache via `setQueryData` (skip if already present from optimistic update, match by id)
- On `DELETE`: remove from cache
- Other users see new posts appear instantly without refresh

## Technical Details

### Optimistic flow
```
User clicks "Publier"
  -> onMutate: inject post with blob URL + isPending flag into cache
  -> Modal closes immediately
  -> Upload file to storage (background)
  -> Insert row into media_posts (background)
  -> onSuccess: replace optimistic entry with real data (real URL)
  -> onError: remove optimistic entry + toast error
```

### Files to create
- `src/hooks/useMediaPosts.ts`

### Files to modify
- `src/components/channels/MediaChannel.tsx` (replace hardcoded array + console.log with real hook usage, update rendering for rich media cards)

### Database changes
- Create `media_posts` table with RLS policies
- Add to realtime publication
