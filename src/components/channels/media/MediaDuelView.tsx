import { useEffect, useMemo, useState } from 'react';
import { Swords, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDuelVotes, useCastDuelVote } from '@/hooks/useMediaDuel';
import { useAuth } from '@/contexts/AuthContext';
import type { MediaPost } from '@/hooks/useMediaPosts';

interface Props {
  post: MediaPost;
  className?: string;
}

function useCountdown(target: string | null | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);
  if (!target) return null;
  const ms = new Date(target).getTime() - now;
  if (ms <= 0) return 'Terminé';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}j ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

export function MediaDuelView({ post, className }: Props) {
  const { user } = useAuth();
  const items = (post.items ?? []).slice(0, 2);
  const { data: votes = [] } = useDuelVotes(post.id);
  const castVote = useCastDuelVote();
  const countdown = useCountdown(post.duel_expires_at ?? null);
  const expired = post.duel_expires_at ? new Date(post.duel_expires_at).getTime() <= Date.now() : false;

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const v of votes) map.set(v.item_id, (map.get(v.item_id) ?? 0) + 1);
    return map;
  }, [votes]);

  const myVote = user ? votes.find((v) => v.user_id === user.id)?.item_id ?? null : null;
  const total = votes.length;

  if (items.length < 2) {
    return (
      <div className={cn('p-4 text-sm text-muted-foreground', className)}>
        Un duel nécessite deux médias.
      </div>
    );
  }

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-center gap-2 py-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        <Swords className="w-3.5 h-3.5" />
        Duel visuel
        {post.duel_expires_at && (
          <span className="inline-flex items-center gap-1 ml-2 text-foreground/80">
            <Clock className="w-3 h-3" />
            {countdown}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-1 bg-black">
        {items.map((it, idx) => {
          const c = counts.get(it.id) ?? 0;
          const pct = total > 0 ? Math.round((c / total) * 100) : 0;
          const isVotedByMe = myVote === it.id;
          const isVideo = it.file_type === 'video';
          const canVote = !!user && !expired;
          return (
            <button
              key={it.id}
              disabled={!canVote}
              onClick={() => castVote.mutate({ postId: post.id, itemId: it.id })}
              className={cn(
                'group relative aspect-[3/4] overflow-hidden bg-black focus:outline-none',
                isVotedByMe && 'ring-2 ring-primary ring-inset',
                canVote ? 'cursor-pointer' : 'cursor-default'
              )}
            >
              {isVideo ? (
                <video src={it.file_url} className="w-full h-full object-cover" muted autoPlay loop playsInline />
              ) : (
                <img src={it.file_url} alt={it.alt_text ?? `Option ${idx + 1}`} className="w-full h-full object-cover" />
              )}

              {/* Vote percentage bar overlay (always visible once user voted or expired) */}
              {(myVote || expired) && (
                <>
                  <div className="absolute inset-x-0 bottom-0 h-2 bg-white/20">
                    <div
                      className={cn('h-full transition-all', isVotedByMe ? 'bg-primary' : 'bg-white/70')}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-black/70 text-white text-xs font-bold backdrop-blur">
                    {pct}% · {c}
                  </div>
                </>
              )}

              {/* Side label */}
              <div className={cn(
                'absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold',
                isVotedByMe ? 'bg-primary text-primary-foreground' : 'bg-black/70 text-white'
              )}>
                {idx === 0 ? 'A' : 'B'}
              </div>

              {canVote && !isVotedByMe && (
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1.5 rounded-full bg-white text-black text-xs font-semibold">
                    Voter {idx === 0 ? 'A' : 'B'}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="px-4 py-2 text-xs text-muted-foreground text-center">
        {total} vote{total > 1 ? 's' : ''}{expired ? ' · clôturé' : myVote ? ' · vous pouvez changer' : ''}
      </div>
    </div>
  );
}
