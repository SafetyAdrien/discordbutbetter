import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Bookmark, VolumeX, BarChart3 } from 'lucide-react';
import { Heart, MessageCircle, Volume2, ChevronLeft, ChevronRight, EyeOff } from '@/components/icons/discord/lucide';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMediaPostReactions, useToggleMediaReaction } from '@/hooks/useMediaReactions';
import { useMediaComments } from '@/hooks/useMediaComments';
import { MarkdownText } from '@/lib/markdown';
import type { MediaPost } from '@/hooks/useMediaPosts';
import { MediaPostActionsMenu } from './MediaPostActionsMenu';
import { EditMediaPostModal } from './EditMediaPostModal';
import { useHasChannelPermission } from '@/hooks/useUserChannelPermissions';

import { appLocale } from '@/i18n/locale';
import { userKey } from '@/lib/userScope';
interface Props {
  post: MediaPost;
  channelId: string;
  serverId?: string | null;
  onOpenDetail: (post: MediaPost) => void;
  onDeleted?: (postId: string) => void;
  onReply?: (post: MediaPost) => void;
}

function relTime(iso: string) {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const m = Math.floor(diffMs / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const j = Math.floor(h / 24);
  if (j < 7) return `il y a ${j} j`;
  return d.toLocaleDateString(appLocale());
}

function useAuthor(userId?: string) {
  return useQuery({
    queryKey: ['profile-lite', userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, display_name, avatar_url').eq('id', userId!).maybeSingle();
      return data as { id: string; display_name: string | null; avatar_url: string | null } | null;
    },
  });
}

const SAVED_KEY = 'media-saved-posts';
function readSaved(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(userKey(SAVED_KEY)) || '[]')); } catch { return new Set(); }
}
function toggleSaved(id: string): boolean {
  const s = readSaved();
  const now = !s.has(id);
  if (now) s.add(id); else s.delete(id);
  localStorage.setItem(userKey(SAVED_KEY), JSON.stringify([...s]));
  return now;
}

export function MediaPostCard({ post, channelId, serverId = null, onOpenDetail, onDeleted, onReply }: Props) {
  const { user } = useAuth();
  const { data: author } = useAuthor(post.author_id);
  const items = post.items?.length ? post.items : [{
    id: `legacy-${post.id}`, post_id: post.id, file_url: post.file_url,
    file_type: post.file_type, file_name: post.file_name, file_size: post.file_size,
    alt_text: post.alt_text, position: 0, created_at: post.created_at,
  }];
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(!post.is_spoiler);
  const [muted, setMuted] = useState(true);
  const [descExpanded, setDescExpanded] = useState(false);
  const [saved, setSaved] = useState(() => readSaved().has(post.id));
  const [heartBurst, setHeartBurst] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const postIds = useMemo(() => [post.id], [post.id]);
  const { data: reactionsData = {} } = useMediaPostReactions(postIds);
  const toggleReaction = useToggleMediaReaction();
  const reactions = reactionsData[post.id] || [];
  const reactionCount = reactions.length;
  const userHeart = !!user && reactions.some((r) => r.emoji === '❤️' && r.user_id === user.id);

  const { data: comments = [] } = useMediaComments(post.id);
  const previewComments = useMemo(() => comments.slice(-2), [comments]);

  const active = items[idx];
  const isVideo = active.file_type === 'video';

  // Video autoplay on visibility
  const videoRef = useRef<HTMLVideoElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isVideo || !videoRef.current) return;
    const vid = videoRef.current;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.intersectionRatio >= 0.6) { vid.play().catch(() => {}); }
          else { vid.pause(); }
        }
      },
      { threshold: [0, 0.6, 1] }
    );
    obs.observe(vid);
    return () => obs.disconnect();
  }, [isVideo, idx]);

  // Double-tap to react ❤️
  const lastTap = useRef(0);
  const handleDoubleTap = useCallback(() => {
    setHeartBurst(true);
    setTimeout(() => setHeartBurst(false), 700);
    toggleReaction.mutate({ postId: post.id, emoji: '❤️', currentReactions: reactions });
  }, [post.id, reactions, toggleReaction]);
  const handleMediaTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTap.current < 280) { handleDoubleTap(); lastTap.current = 0; }
    else { lastTap.current = now; }
  }, [handleDoubleTap]);

  // Swipe carousel (touch)
  const touchX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current == null || items.length < 2) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 50) {
      setIdx((i) => (dx < 0 ? (i + 1) % items.length : (i - 1 + items.length) % items.length));
    }
    touchX.current = null;
  };

  const isAuthor = user?.id === post.author_id;
  const canManageMedia = useHasChannelPermission(channelId, 'manage_media').data;
  const descShort = post.description && post.description.length > 140 && !descExpanded;

  // ---- Front face ----
  const FrontFace = (
    <div className="relative [backface-visibility:hidden] bg-[hsl(var(--surface-2))] rounded-2xl border border-border/40 overflow-hidden shadow-[var(--shadow-elevation-1)] flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3">
        <Avatar className="w-9 h-9">
          <AvatarImage src={author?.avatar_url ?? undefined} />
          <AvatarFallback>{author?.display_name?.[0] ?? '?'}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate leading-tight">
            {author?.display_name ?? 'Utilisateur'}
          </p>
          <p className="text-xs text-muted-foreground">{relTime(post.created_at)}</p>
        </div>
        <MediaPostActionsMenu
          post={post}
          channelId={channelId}
          serverId={serverId}
          isAuthor={isAuthor}
          canDelete={isAuthor || canManageMedia}
          onEdit={() => setEditOpen(true)}
          onReply={() => onReply?.(post)}
          onDeleted={onDeleted}
        />
      </header>

      {/* Media */}
      (
      <div
        className="relative bg-black select-none"
        style={{ aspectRatio: '4 / 5', maxHeight: '80vh' }}
        onClick={handleMediaTap}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {!revealed && post.is_spoiler ? (
          <button type="button"
            onClick={(e) => { e.stopPropagation(); setRevealed(true); }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-xl text-foreground"
          >
            <div className="w-16 h-16 rounded-full bg-foreground/10 flex items-center justify-center">
              <EyeOff className="w-8 h-8" />
            </div>
            <span className="text-sm font-medium">Spoiler — cliquer pour afficher</span>
          </button>
        ) : isVideo ? (
          <>
            <video
              ref={videoRef}
              src={active.file_url}
              className="w-full h-full object-contain bg-black"
              muted={muted}
              loop
              playsInline
            />
            <button type="button"
              onClick={(e) => { e.stopPropagation(); setMuted((m) => !m); }}
              className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center"
              aria-label={muted ? 'Activer le son' : 'Couper le son'}
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </>
        ) : (
          <img
            src={active.file_url}
            alt={active.alt_text || post.title}
            className="w-full h-full object-contain"
            draggable={false}
          />
        )}

        {heartBurst && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <Heart className="w-28 h-28 text-white drop-shadow-2xl animate-[ping_700ms_ease-out]" fill="currentColor" />
          </div>
        )}

        {items.length > 1 && revealed && (
          <>
            <button type="button"
              onClick={(e) => { e.stopPropagation(); setIdx((i) => (i - 1 + items.length) % items.length); }}
              className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 text-white items-center justify-center"
              aria-label="Précédent"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button type="button"
              onClick={(e) => { e.stopPropagation(); setIdx((i) => (i + 1) % items.length); }}
              className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 text-white items-center justify-center"
              aria-label="Suivant"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {items.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    'rounded-full transition-all',
                    i === idx ? 'w-2 h-2 bg-white' : 'w-1.5 h-1.5 bg-white/50'
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Actions pills */}
      <div className="flex items-center gap-2 px-3 py-2">
        <button type="button"
          onClick={() => toggleReaction.mutate({ postId: post.id, emoji: '❤️', currentReactions: reactions })}
          className={cn(
            'inline-flex items-center gap-1.5 pl-2 pr-3 py-1.5 rounded-full bg-muted hover:bg-muted/70 transition-colors',
            userHeart && 'bg-[hsl(var(--destructive)/0.12)] hover:bg-[hsl(var(--destructive)/0.18)]'
          )}
          aria-label="Réagir"
        >
          <Heart
            className={cn('w-5 h-5', userHeart ? 'text-[hsl(var(--destructive))] fill-current' : 'text-foreground')}
          />
          <span className={cn('text-sm font-semibold tabular-nums', userHeart && 'text-[hsl(var(--destructive))]')}>
            {reactionCount}
          </span>
        </button>
        <button type="button"
          onClick={() => onOpenDetail(post)}
          className="inline-flex items-center gap-1.5 pl-2 pr-3 py-1.5 rounded-full bg-muted hover:bg-muted/70 transition-colors"
          aria-label="Commenter"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="text-sm font-semibold tabular-nums">{comments.length}</span>
        </button>
        <div className="flex-1" />
        <button type="button"
          onClick={() => setSaved(toggleSaved(post.id))}
          className="p-2 hover:bg-muted rounded-full transition-colors"
          aria-label={saved ? 'Retirer des sauvegardés' : 'Sauvegarder'}
        >
          <Bookmark className={cn('w-5 h-5', saved && 'fill-current text-primary')} />
        </button>
      </div>

      {/* Title + description */}
      {(post.title || post.description) && (
        <div className="px-4 pt-1 pb-2 text-sm">
          {post.title && <span className="font-semibold mr-2">{post.title}</span>}
          {post.description && (
            <span>
              <span className={cn(descShort && 'line-clamp-2 inline')}>
                <MarkdownText variant="chat" content={post.description} />
              </span>
              {descShort && (
                <button type="button" onClick={() => setDescExpanded(true)} className="text-muted-foreground hover:underline ml-1">
                  voir plus
                </button>
              )}
            </span>
          )}
        </div>
      )}

      {/* Inline comments preview */}
      {previewComments.length > 0 && (
        <div className="px-4 pb-2 space-y-1">
          {previewComments.map((c) => (
            <div key={c.id} className="text-sm">
              <span translate="no" className="font-semibold mr-2">{c.author?.display_name}</span>
              <span translate="no" className="text-muted-foreground">{c.content}</span>
            </div>
          ))}
          {comments.length > previewComments.length && (
            <button type="button" onClick={() => onOpenDetail(post)} className="text-xs text-muted-foreground hover:underline">
              Voir les {comments.length} commentaires
            </button>
          )}
        </div>
      )}

      <button type="button"
        onClick={() => onOpenDetail(post)}
        className="mt-auto w-full text-left px-4 py-3 text-sm text-muted-foreground border-t border-border/40 hover:bg-muted/30 transition-colors"
      >
        Ajouter un commentaire…
      </button>
    </div>
  );

  return (
    <>
      <div
        ref={cardRef}
        className="w-full max-w-[600px] mx-auto"
        style={{ perspective: '1600px' }}
      >
        <div
          className="relative w-full [transform-style:preserve-3d]"
          style={{
            transition: 'transform 600ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {FrontFace}
        </div>
      </div>

      {editOpen && <EditMediaPostModal post={post} channelId={channelId} onClose={() => setEditOpen(false)} />}
    </>
  );
}

