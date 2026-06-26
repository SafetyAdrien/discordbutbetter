import { useMemo } from 'react';
import { ArrowLeft, Swords } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { useDuelVotes } from '@/hooks/useMediaDuel';
import { useMediaComments } from '@/hooks/useMediaComments';
import { useMediaPostReactions } from '@/hooks/useMediaReactions';
import type { MediaPost } from '@/hooks/useMediaPosts';

interface Props {
  post: MediaPost;
  onBack: () => void;
}

export function MediaDuelStatsBack({ post, onBack }: Props) {
  const { data: votes = [] } = useDuelVotes(post.id);
  const { data: comments = [] } = useMediaComments(post.id);
  const { data: reactionsMap = {} } = useMediaPostReactions([post.id]);
  const reactions = reactionsMap[post.id] || [];

  const items = (post.items ?? []).slice(0, 2);

  const data = useMemo(() => {
    return items.map((it, idx) => {
      const count = votes.filter((v) => v.item_id === it.id).length;
      const pct = votes.length > 0 ? Math.round((count / votes.length) * 100) : 0;
      return {
        name: idx === 0 ? 'Option A' : 'Option B',
        votes: count,
        pct,
        fill: idx === 0 ? 'hsl(var(--primary))' : 'hsl(var(--accent))',
      };
    });
  }, [items, votes]);

  return (
    <div className="h-full w-full flex flex-col p-5 gap-4">
      <header className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8" aria-label="Retour">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Swords className="w-4 h-4 text-muted-foreground" />
        <h3 className="font-semibold text-sm">Statistiques du duel</h3>
      </header>

      <div className="grid grid-cols-3 gap-2">
        <MiniStat label="Votes" value={votes.length} />
        <MiniStat label="Commentaires" value={comments.length} />
        <MiniStat label="Réactions" value={reactions.length} />
      </div>

      <div className="flex-1 min-h-[200px] rounded-xl bg-[hsl(var(--surface-1))] border border-border/40 p-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 10, right: 30, top: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
            <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} />
            <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} width={70} />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(v: number, _n, ctx: any) => [`${v} vote${v > 1 ? 's' : ''} (${ctx.payload.pct}%)`, 'Votes']}
            />
            <Bar dataKey="votes" radius={[0, 8, 8, 0]} animationDuration={700}>
              {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {data.map((d) => (
          <div key={d.name} className="rounded-xl border border-border/40 p-3 bg-[hsl(var(--surface-2))]">
            <p className="text-xs text-muted-foreground">{d.name}</p>
            <p className="text-2xl font-bold tabular-nums">{d.pct}%</p>
            <p className="text-xs text-muted-foreground">{d.votes} vote{d.votes > 1 ? 's' : ''}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-[hsl(var(--surface-2))] border border-border/40 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-lg font-bold tabular-nums leading-none mt-0.5">{value}</p>
    </div>
  );
}
