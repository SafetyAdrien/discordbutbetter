import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { StreamlineForum } from '@/components/icons/StreamlineForum';
import { StreamlineMedia } from '@/components/icons/StreamlineMedia';
import { useForumThreads } from '@/hooks/useForumThreads';
import { requestOpenForumPost, timeAgo } from '@/lib/forum';

/*
 * Survol d'un salon Forum / Multimedia dans la liste des salons (video de reference) : petite carte "Plus de posts
 * actifs" avec les posts recents (avatar, titre, anciennete) et "Voir tout". Les posts ne sont charges qu'a l'ouverture.
 */

function Content({ channelId, type, onOpenChannel }: { channelId: string; type: 'forum' | 'media'; onOpenChannel: () => void }) {
  const { data: posts = [] } = useForumThreads(channelId);
  const active = posts.filter((p) => !p.archived).sort((a, b) => (b.last_message_at ?? b.created_at).localeCompare(a.last_message_at ?? a.created_at)).slice(0, 5);
  const Icon = type === 'media' ? StreamlineMedia : StreamlineForum;
  return (
    <>
      {active.length > 0 && <p className="px-2 pb-1 text-sm text-[#b5bac1]">Plus de posts actifs</p>}
      {active.map((p) => {
        const a = p.starter?.author;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => { onOpenChannel(); requestOpenForumPost(channelId, p.id); }}
            className="w-full h-9 px-2 flex items-center gap-2 rounded-[4px] text-left text-base text-white hover:bg-[#464650]"
          >
            {a?.avatar_url ? <img src={a.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" /> : <span className="w-5 h-5 rounded-full bg-[#5865f2] text-[10px] font-semibold flex items-center justify-center shrink-0">{(a?.display_name || a?.username || '?').charAt(0).toUpperCase()}</span>}
            <span translate="no" className="truncate">{p.name}</span>
            <span className="text-[#b5bac1]">•</span>
            <span className="text-sm text-[#b5bac1] whitespace-nowrap">{timeAgo(p.last_message_at ?? p.created_at)}</span>
          </button>
        );
      })}
      <button type="button" onClick={onOpenChannel} className="w-full h-10 px-2 flex items-center gap-2.5 rounded-[4px] text-left text-base text-white hover:bg-[#464650]">
        <Icon className="w-5 h-5 text-[#b5bac1]" size={20} /> Voir tout
      </button>
    </>
  );
}

export function ForumChannelHoverCard({ channelId, type, onOpenChannel, children }: { channelId: string; type: 'forum' | 'media'; onOpenChannel: () => void; children: React.ReactNode }) {
  return (
    <HoverCard openDelay={400} closeDelay={80}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent side="right" align="start" sideOffset={6} className="w-[300px] p-2 rounded-lg bg-[#2f2f37] border border-white/[0.06] shadow-[0_8px_16px_rgba(0,0,0,0.24)] z-[120]">
        <Content channelId={channelId} type={type} onOpenChannel={onOpenChannel} />
      </HoverCardContent>
    </HoverCard>
  );
}
