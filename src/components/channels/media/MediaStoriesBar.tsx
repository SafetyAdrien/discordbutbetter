import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import type { MediaPost } from '@/hooks/useMediaPosts';

interface Props {
  posts: MediaPost[];
  seenIds: Set<string>;
  onOpen: (index: number) => void;
}

function useAuthors(ids: string[]) {
  return useQuery({
    queryKey: ['profile-lite-batch', ids.sort().join(',')],
    enabled: ids.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, display_name, avatar_url').in('id', ids);
      const map = new Map<string, { id: string; display_name: string | null; avatar_url: string | null }>();
      for (const p of data ?? []) map.set((p as any).id, p as any);
      return map;
    },
  });
}

export function MediaStoriesBar({ posts, seenIds, onOpen }: Props) {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const stories = useMemo(
    () => posts.filter((p) => new Date(p.created_at).getTime() >= cutoff).slice(0, 30),
    [posts, cutoff]
  );
  const authorIds = useMemo(() => [...new Set(stories.map((s) => s.author_id))], [stories]);
  const { data: authors } = useAuthors(authorIds);

  if (stories.length === 0) return null;

  return (
    <div className="px-4 py-3 border-b border-border/40 bg-[hsl(var(--surface-2)/0.4)] overflow-x-auto">
      <div className="flex gap-3 min-w-min">
        {stories.map((p, i) => {
          const a = authors?.get(p.author_id);
          const cover = p.items?.[0] ?? { file_url: p.file_url, file_type: p.file_type };
          const seen = seenIds.has(p.id);
          return (
            <button
              key={p.id}
              onClick={() => onOpen(i)}
              className="flex flex-col items-center gap-1.5 flex-shrink-0 group"
            >
              <div
                className={cn(
                  'w-16 h-16 rounded-full p-[2px]',
                  seen ? 'bg-muted' : 'bg-gradient-to-tr from-amber-400 via-pink-500 to-violet-600'
                )}
              >
                <div className="w-full h-full rounded-full p-[2px] bg-background">
                  <div className="w-full h-full rounded-full overflow-hidden bg-muted">
                    {cover.file_type === 'video' ? (
                      <video src={cover.file_url} className="w-full h-full object-cover" muted />
                    ) : (
                      <img src={cover.file_url} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                </div>
              </div>
              <span className="text-[11px] text-muted-foreground max-w-[68px] truncate">
                {a?.display_name ?? '…'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
