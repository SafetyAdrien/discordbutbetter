import { Eye, MessageCircle, Pin, Lock } from '@/components/icons/discord/lucide';
import type { ForumTag } from '@/hooks/useForumTags';
import { postMedia, replyCount, type ForumThread } from '@/hooks/useForumThreads';
import type { ThreadReaction } from '@/hooks/useThreadReactions';
import type { StoredAttachment } from '@/components/chat/MessageAttachments';
import { cn } from '@/lib/utils';
import { ForumTagChip } from './ForumTagChip';
import { timeAgo } from '@/lib/forum';
import { ForumEmoji } from './ForumEmoji';

/*
 * Cartes de post (videos de reference) :
 *  - galerie (Forum) : auteur + "Poste il y a", titre, medias en grand avec
 *    les tags par-dessus, puis reponses et reaction par defaut ;
 *  - liste (Forum) : tags, titre, "Auteur : debut du message", reaction,
 *    reponses et anciennete, miniature a droite ;
 *  - tuile (Multimedia) : la vignette du post occupe la carte.
 */

interface CardProps {
  post: ForumThread;
  tags: ForumTag[];
  variant: 'gallery' | 'list' | 'media';
  active?: boolean;
  /** Post jamais ouvert ou avec de nouveaux messages : titre en blanc, sinon grise (video). */
  unread?: boolean;
  defaultEmoji: string | null;
  reactions: ThreadReaction[];
  myUserId?: string;
  onOpen: () => void;
  onReact: (emoji: string) => void;
}

function MediaThumb({ a, spoiler, className }: { a: StoredAttachment; spoiler: boolean; className?: string }) {
  const hidden = spoiler || a.isSpoiler;
  const isGif = a.type === 'gif' || /\.gif($|\?)/i.test(a.name ?? a.url);
  return (
    <div className={cn('relative overflow-hidden bg-black/30', className)}>
      {a.type === 'video' ? (
        <video src={a.url} muted preload="metadata" className={cn('h-full w-full object-cover', hidden && 'blur-2xl scale-110')} />
      ) : (
        <img src={a.url} alt={a.description ?? ''} loading="lazy" className={cn('h-full w-full object-cover', hidden && 'blur-2xl scale-110')} />
      )}
      {hidden && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="h-8 w-8 rounded-full bg-black/40 flex items-center justify-center text-white">
            <Eye className="w-4 h-4" />
          </span>
        </span>
      )}
      {isGif && !hidden && <span className="absolute top-1.5 left-1.5 px-1 rounded bg-black/70 text-[10px] font-bold text-white">GIF</span>}
    </div>
  );
}

function ReactionButton({ emoji, reactions, myUserId, onReact }: { emoji: string; reactions: ThreadReaction[]; myUserId?: string; onReact: (emoji: string) => void }) {
  const count = reactions.filter((r) => r.emoji === emoji).length;
  const mine = reactions.some((r) => r.emoji === emoji && r.user_id === myUserId);
  return (
    <button
      type="button"
      aria-label={`Réagir avec ${emoji}`}
      onClick={(e) => {
        e.stopPropagation();
        onReact(emoji);
      }}
      className={cn(
        'h-7 px-2 rounded-md flex items-center gap-1.5 text-sm font-semibold transition-colors',
        mine ? 'bg-primary/20 ring-1 ring-inset ring-primary text-white' : 'bg-[hsl(var(--button-secondary))] text-muted-foreground hover:ring-1 hover:ring-inset hover:ring-white/20',
      )}
    >
      <ForumEmoji emoji={emoji} className="text-lg" />
      {count > 0 && <span>{count}</span>}
    </button>
  );
}

/** Pastille bleue d'un post epingle (video de reference), devant les tags. */
function PinBadge() {
  return (
    <span className="h-5 w-5 shrink-0 rounded-full bg-[#5865f2] flex items-center justify-center text-white" aria-label="Épinglé" title="Épinglé">
      <Pin className="w-3 h-3 fill-current" />
    </span>
  );
}

export function ForumPostCard({ post, tags, variant, active, unread = true, defaultEmoji, reactions, myUserId, onOpen, onReact }: CardProps) {
  const media = postMedia(post);
  const tagObjs = post.applied_tags.map((id) => tags.find((t) => t.id === id)).filter(Boolean) as ForumTag[];
  const author = post.starter?.author;
  const authorName = author?.display_name || author?.username || 'Utilisateur';
  const replies = replyCount(post);
  const titleIcons = (
    <>
      {post.locked && <Lock className="w-3.5 h-3.5 shrink-0 text-[hsl(var(--icon-default))]" aria-label="Verrouillé" />}
    </>
  );

  const shell = cn(
    'group relative rounded-lg bg-[hsl(var(--surface-card))] border border-[hsl(var(--border-subtle))] cursor-pointer transition-colors text-left',
    'hover:bg-[hsl(var(--interactive-background-hover))]',
    active && 'ring-1 ring-primary',
  );

  if (variant === 'list') {
    const thumb = post.thumbnail_url ? ({ url: post.thumbnail_url, type: 'image', name: '', id: 't', size: 0 } as StoredAttachment) : media[0];
    return (
      <div role="button" tabIndex={0} onClick={onOpen} onKeyDown={(e) => e.key === 'Enter' && onOpen()} className={cn(shell, 'flex gap-3 p-3.5')}>
        <div className="flex-1 min-w-0">
          {(post.pinned || tagObjs.length > 0) && (
            <div className="mb-1 flex flex-wrap items-center gap-1">
              {post.pinned && <PinBadge />}
              {tagObjs.map((t) => <ForumTagChip key={t.id} tag={t} size="sm" />)}
            </div>
          )}
          <p className={cn('flex items-center gap-1.5 text-xl leading-6 font-medium group-hover:text-white', unread ? 'text-white' : 'text-[#b5bac1]')}>
            {titleIcons}
            <span translate="no" className="truncate">{post.name}</span>
          </p>
          <p className="mt-1 text-sm text-[#b5bac1] truncate">
            <span translate="no" className="font-medium text-[hsl(var(--header-icon))]">{authorName}</span>
            {post.starter?.content ? <>: <span translate="no">{post.starter.content}</span></> : null}
          </p>
          <div className="mt-2.5 flex items-center gap-3 text-sm text-[#b5bac1]">
            {defaultEmoji && <ReactionButton emoji={defaultEmoji} reactions={reactions} myUserId={myUserId} onReact={onReact} />}
            <span className="flex items-center gap-1"><MessageCircle className="w-4 h-4" />{replies}</span>
            <span>{timeAgo(post.last_message_at ?? post.created_at)}</span>
          </div>
        </div>
        {thumb && <MediaThumb a={thumb} spoiler={post.spoiler} className="h-20 w-20 shrink-0 rounded-lg self-center" />}
      </div>
    );
  }

  const shown = variant === 'media'
    ? (post.thumbnail_url ? [{ url: post.thumbnail_url, type: 'image', name: '', id: 't', size: 0 } as StoredAttachment] : media.slice(0, 1))
    : media.slice(0, 2);

  return (
    <div role="button" tabIndex={0} onClick={onOpen} onKeyDown={(e) => e.key === 'Enter' && onOpen()} className={cn(shell, 'flex flex-col p-3')}>
      <p className="text-xs text-muted-foreground truncate">
        <span translate="no" className="font-medium text-[hsl(var(--header-icon))]">{authorName}</span> Posté {timeAgo(post.created_at)}
      </p>
      <p className="mt-0.5 mb-2 flex items-center gap-1.5 text-sm font-semibold text-white">
        {titleIcons}
        <span translate="no" className="truncate">{post.name}</span>
      </p>
      {shown.length > 0 ? (
        <div className={cn('relative rounded-lg overflow-hidden grid gap-0.5', shown.length > 1 ? 'grid-cols-2' : 'grid-cols-1', variant === 'media' ? 'aspect-[4/3]' : 'aspect-[16/11]')}>
          {shown.map((a) => <MediaThumb key={a.id ?? a.url} a={a} spoiler={post.spoiler} className="h-full" />)}
          {tagObjs.length > 0 && (
            <div className="absolute left-2 bottom-2 flex flex-wrap gap-1">
              {tagObjs.map((t) => <ForumTagChip key={t.id} tag={t} size="sm" className="bg-black/70" />)}
            </div>
          )}
        </div>
      ) : (
        <>
          {post.starter?.content && <p translate="no" className="text-sm text-muted-foreground line-clamp-4 whitespace-pre-line">{post.starter.content}</p>}
          {tagObjs.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {tagObjs.map((t) => <ForumTagChip key={t.id} tag={t} size="sm" />)}
            </div>
          )}
        </>
      )}
      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><MessageCircle className="w-4 h-4" />{replies}</span>
        <span className="ml-auto">{defaultEmoji && <ReactionButton emoji={defaultEmoji} reactions={reactions} myUserId={myUserId} onReact={onReact} />}</span>
      </div>
    </div>
  );
}
