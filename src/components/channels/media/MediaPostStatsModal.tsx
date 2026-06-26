import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useMediaPostReactions } from '@/hooks/useMediaReactions';
import { useMediaComments } from '@/hooks/useMediaComments';
import { useDuelVotes } from '@/hooks/useMediaDuel';
import { cn } from '@/lib/utils';
import type { MediaPost } from '@/hooks/useMediaPosts';

interface Props {
  post: MediaPost;
  onClose: () => void;
}

function useProfiles(userIds: string[]) {
  return useQuery({
    queryKey: ['profiles-lite-batch', userIds.slice().sort().join(',')],
    enabled: userIds.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, display_name, avatar_url').in('id', userIds);
      return (data ?? []) as { id: string; display_name: string | null; avatar_url: string | null }[];
    },
  });
}

export function MediaPostStatsModal({ post, onClose }: Props) {
  const { data: reactionsMap = {} } = useMediaPostReactions([post.id]);
  const reactions = reactionsMap[post.id] || [];
  const { data: comments = [] } = useMediaComments(post.id);
  const { data: votes = [] } = useDuelVotes(post.is_duel ? post.id : null);

  const voterIds = useMemo(() => votes.map((v) => v.user_id), [votes]);
  const { data: profiles = [] } = useProfiles(voterIds);
  const profileById = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles]);

  const reactionsByEmoji = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of reactions) m.set(r.emoji, (m.get(r.emoji) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [reactions]);

  const items = (post.items ?? []).slice(0, 2);
  const votesByItem = useMemo(() => {
    const m = new Map<string, typeof votes>();
    for (const v of votes) {
      const arr = m.get(v.item_id) ?? [];
      arr.push(v);
      m.set(v.item_id, arr);
    }
    return m;
  }, [votes]);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Statistiques du post</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-5 pb-2">
            {/* Counters */}
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Commentaires" value={comments.length} />
              <Stat label="Réactions" value={reactions.length} />
              <Stat label={post.is_duel ? 'Votes' : 'Médias'} value={post.is_duel ? votes.length : (post.items?.length ?? 1)} />
            </div>

            {/* Reactions breakdown */}
            {reactionsByEmoji.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold mb-2">Réactions par emoji</h3>
                <div className="flex flex-wrap gap-2">
                  {reactionsByEmoji.map(([emoji, count]) => (
                    <div key={emoji} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-sm">
                      <span>{emoji}</span>
                      <span className="font-semibold tabular-nums">{count}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Duel votes table */}
            {post.is_duel && items.length === 2 && (
              <section>
                <h3 className="text-sm font-semibold mb-2">Votes par option</h3>
                <div className="grid grid-cols-2 gap-3">
                  {items.map((it, idx) => {
                    const voters = votesByItem.get(it.id) ?? [];
                    const pct = votes.length > 0 ? Math.round((voters.length / votes.length) * 100) : 0;
                    return (
                      <div key={it.id} className="rounded-xl border border-border overflow-hidden bg-[hsl(var(--surface-2))]">
                        <div className="relative aspect-video bg-black">
                          {it.file_type === 'video'
                            ? <video src={it.file_url} className="w-full h-full object-cover" muted />
                            : <img src={it.file_url} alt="" className="w-full h-full object-cover" />}
                          <div className={cn(
                            'absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold',
                            'bg-black/70 text-white'
                          )}>
                            {idx === 0 ? 'A' : 'B'}
                          </div>
                          <div className="absolute top-2 right-2 px-2 py-1 rounded-md bg-black/70 text-white text-xs font-bold">
                            {pct}% · {voters.length}
                          </div>
                        </div>
                        <div className="p-2 space-y-1.5 max-h-64 overflow-y-auto">
                          {voters.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic px-2 py-1.5">Aucun vote</p>
                          ) : voters.map((v) => {
                            const p = profileById.get(v.user_id);
                            return (
                              <div key={v.id} className="flex items-center gap-2 px-1.5 py-1 rounded-md hover:bg-muted/60">
                                <Avatar className="w-6 h-6">
                                  <AvatarImage src={p?.avatar_url ?? undefined} />
                                  <AvatarFallback>{p?.display_name?.[0] ?? '?'}</AvatarFallback>
                                </Avatar>
                                <span className="text-xs truncate">{p?.display_name ?? 'Utilisateur'}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-[hsl(var(--surface-2))] border border-border/40 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
