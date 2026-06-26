import { useState, useEffect, useCallback } from 'react';
import { MediaPostCard } from './MediaPostCard';
import { MediaStoriesBar } from './MediaStoriesBar';
import { MediaStoryViewer } from './MediaStoryViewer';
import type { MediaPost } from '@/hooks/useMediaPosts';

interface Props {
  posts: MediaPost[];
  channelId: string;
  serverId?: string | null;
  onOpenDetail: (post: MediaPost) => void;
  onDeleted?: (postId: string) => void;
}

const SEEN_KEY_PREFIX = 'media-stories-seen:';

function readSeen(channelId: string): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY_PREFIX + channelId) || '[]')); }
  catch { return new Set(); }
}

export function MediaFeed({ posts, channelId, serverId = null, onOpenDetail, onDeleted }: Props) {
  const [seenIds, setSeenIds] = useState<Set<string>>(() => readSeen(channelId));
  const [storyIndex, setStoryIndex] = useState<number | null>(null);

  useEffect(() => { setSeenIds(readSeen(channelId)); }, [channelId]);

  const handleSeen = useCallback((postId: string) => {
    setSeenIds((prev) => {
      if (prev.has(postId)) return prev;
      const next = new Set(prev); next.add(postId);
      try { localStorage.setItem(SEEN_KEY_PREFIX + channelId, JSON.stringify([...next])); } catch {}
      return next;
    });
  }, [channelId]);

  // Stories list = same filter as MediaStoriesBar (posts < 24h)
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const stories = posts.filter((p) => new Date(p.created_at).getTime() >= cutoff).slice(0, 30);

  return (
    <div className="w-full">
      <MediaStoriesBar
        posts={posts}
        seenIds={seenIds}
        onOpen={(i) => setStoryIndex(i)}
      />
      <div className="px-2 sm:px-4 py-4 space-y-4">
        {posts.map((p) => (
          <MediaPostCard
            key={p.id}
            post={p}
            channelId={channelId}
            serverId={serverId}
            onOpenDetail={onOpenDetail}
            onDeleted={onDeleted}
          />
        ))}
      </div>

      {storyIndex !== null && stories.length > 0 && (
        <MediaStoryViewer
          posts={stories}
          startIndex={storyIndex}
          onClose={() => setStoryIndex(null)}
          onSeen={handleSeen}
        />
      )}
    </div>
  );
}
