import { useState, useEffect, useMemo, useRef } from 'react';
import { Brush, Archive, ArchiveRestore } from 'lucide-react';
import { ChevronLeft, ChevronRight, X, EyeOff, Heart, MessageCircle, Pin, Lock } from '@/components/icons/discord/lucide';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MediaComments } from './MediaComments';
import { useUpdateMediaPost } from '@/hooks/useMediaModeration';
import { CanvasLiveOverlay } from './CanvasLiveOverlay';
import { MediaPostActionsMenu } from './MediaPostActionsMenu';
import { EditMediaPostModal } from './EditMediaPostModal';
import { useHasChannelPermission } from '@/hooks/useUserChannelPermissions';
import { InfiniteZoomImage } from '@/components/channels/shared/InfiniteZoomImage';
import { useAuth } from '@/contexts/AuthContext';
import { useMediaPostReactions, useToggleMediaReaction } from '@/hooks/useMediaReactions';
import { useMediaComments as useMediaCommentsHook } from '@/hooks/useMediaComments';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import type { MediaPost } from '@/hooks/useMediaPosts';

import { appLocale } from '@/i18n/locale';
interface Props {
  post: MediaPost;
  channelId: string;
  serverId?: string | null;
  onClose: () => void;
  onReply?: (post: MediaPost) => void;
}


function useAuthorProfile(userId: string | undefined) {
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

export function MediaPostSidePanel({ post, channelId, serverId = null, onClose, onReply }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: author } = useAuthorProfile(post.author_id);
  const [activeIndex, setActiveIndex] = useState(0);
  const [revealed, setRevealed] = useState(!post.is_spoiler);
  const [drawing, setDrawing] = useState(false);
  const mediaBoxRef = useRef<HTMLDivElement>(null);
  const [mediaBox, setMediaBox] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = mediaBoxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setMediaBox({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setMediaBox({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const items = post.items?.length
    ? post.items
    : [{
        id: `legacy-${post.id}`,
        post_id: post.id,
        file_url: post.file_url,
        file_type: post.file_type,
        file_name: post.file_name,
        file_size: post.file_size,
        alt_text: post.alt_text,
        position: 0,
        created_at: post.created_at,
      }];

  const activeItem = items[activeIndex];
  const isImage = activeItem.file_type === 'image';

  const postIds = useMemo(() => [post.id], [post.id]);
  const { data: reactionsData = {} } = useMediaPostReactions(postIds);
  const toggleReaction = useToggleMediaReaction();

  const handleToggleReaction = (emoji: string) => {
    toggleReaction.mutate({ postId: post.id, emoji, currentReactions: reactionsData?.[post.id] || [] });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && items.length > 1) setActiveIndex((i) => (i - 1 + items.length) % items.length);
      if (e.key === 'ArrowRight' && items.length > 1) setActiveIndex((i) => (i + 1) % items.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [items.length, onClose]);

  const [editOpen, setEditOpen] = useState(false);

  const postReactions = reactionsData[post.id] || [];
  const heartList = postReactions.filter((r) => r.emoji === '❤️');
  const heartCount = heartList.length;
  const heartReacted = !!user && heartList.some((r) => r.user_id === user.id);

  const { data: comments = [] } = useMediaCommentsHook(post.id);
  const commentCount = comments.length;

  const isAuthor = user?.id === post.author_id;
  const canManageMedia = useHasChannelPermission(channelId, 'manage_media').data;
  // Forum parity: moderators pin / lock / archive media posts like forum posts.
  const updatePost = useUpdateMediaPost(channelId);
  const canModerate = useHasChannelPermission(channelId, 'manage_forum_posts').data;



  return (
    <div className="h-full flex flex-col bg-background border-l border-border">
      {/* Header */}
      <div className="h-12 px-3 flex items-center gap-3 border-b border-border flex-shrink-0">
        <Avatar className="w-7 h-7">
          <AvatarImage src={author?.avatar_url ?? undefined} />
          <AvatarFallback>{author?.display_name?.[0] ?? '?'}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate leading-tight">{post.title || author?.display_name || 'Post'}</p>
          <p className="text-xs text-muted-foreground truncate">
            {author?.display_name ?? 'Utilisateur'} · {new Date(post.created_at).toLocaleDateString(appLocale())}
          </p>
        </div>
        {canModerate && (
          <>
            <Button
              variant="ghost" size="icon" className={cn('h-8 w-8', post.is_pinned && 'text-primary')}
              onClick={() => updatePost.mutate({ postId: post.id, is_pinned: !post.is_pinned })}
              aria-label={post.is_pinned ? 'Désépingler' : 'Épingler'}
              title={post.is_pinned ? 'Désépingler' : 'Épingler'}
            >
              <Pin className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost" size="icon" className={cn('h-8 w-8', post.is_locked && 'text-primary')}
              onClick={() => updatePost.mutate({ postId: post.id, is_locked: !post.is_locked })}
              aria-label={post.is_locked ? 'Déverrouiller' : 'Verrouiller'}
              title={post.is_locked ? 'Déverrouiller' : 'Verrouiller'}
            >
              <Lock className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost" size="icon" className={cn('h-8 w-8', post.archived && 'text-primary')}
              onClick={() => {
                const next = !post.archived;
                updatePost.mutate({ postId: post.id, archived: next });
                if (next) onClose();
              }}
              aria-label={post.archived ? 'Désarchiver' : 'Archiver'}
              title={post.archived ? 'Désarchiver' : 'Archiver'}
            >
              {post.archived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
            </Button>
          </>
        )}
        <MediaPostActionsMenu
          post={post}
          channelId={channelId}
          serverId={serverId}
          isAuthor={isAuthor}
          canDelete={isAuthor || canManageMedia}
          onEdit={() => setEditOpen(true)}
          onReply={() => onReply?.(post)}
          onDeleted={() => onClose()}
        />

        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">

          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Media area (top) */}
      {(
        <div ref={mediaBoxRef} className="relative bg-black flex items-center justify-center" style={{ height: '55%' }}>
          {!revealed && post.is_spoiler ? (
            <button type="button" onClick={() => setRevealed(true)} className="flex flex-col items-center gap-3 text-white">
              <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
                <EyeOff className="w-8 h-8" />
              </div>
              <span className="text-sm font-medium">Spoiler — cliquer pour afficher</span>
            </button>
          ) : isImage ? (
            <InfiniteZoomImage src={activeItem.file_url} alt={activeItem.alt_text || post.title} className="w-full h-full" />
          ) : (
            <video src={activeItem.file_url} className="max-w-full max-h-full" controls autoPlay />
          )}

          {/* Canvas Live overlay (images only) */}
          {revealed && isImage && mediaBox.w > 0 && (
            <CanvasLiveOverlay
              postId={post.id}
              itemId={activeItem.id}
              width={mediaBox.w}
              height={mediaBox.h}
              active={drawing}
              onClose={() => setDrawing(false)}
            />
          )}

          {revealed && isImage && !drawing && (
            <button type="button"
              onClick={() => setDrawing(true)}
              className="absolute top-2 right-2 z-20 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center"
              title="Annoter en direct"
            >
              <Brush className="w-4 h-4" />
            </button>
          )}

          {items.length > 1 && revealed && (
            <>
              <button type="button"
                onClick={() => setActiveIndex((i) => (i - 1 + items.length) % items.length)}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center z-10"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button type="button"
                onClick={() => setActiveIndex((i) => (i + 1) % items.length)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center z-10"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-black/60 text-white text-xs font-medium z-10">
                {activeIndex + 1} / {items.length}
              </div>
            </>
          )}
        </div>
      )}

      {/* Thumbnail strip */}
      {items.length > 1 && (
        <div className="px-3 py-2 flex gap-1.5 overflow-x-auto border-b border-border flex-shrink-0">
          {items.map((it, idx) => (
            <button type="button"
              key={it.id}
              onClick={() => setActiveIndex(idx)}
              className={cn(
                'w-12 h-12 rounded overflow-hidden border-2 flex-shrink-0',
                idx === activeIndex ? 'border-primary' : 'border-transparent opacity-60 hover:opacity-100'
              )}
            >
              {it.file_type === 'video'
                ? <video src={it.file_url} className="w-full h-full object-cover" muted />
                : <img src={it.file_url} alt="" className="w-full h-full object-cover" />}
            </button>
          ))}
        </div>
      )}

      {/* Description + actions pills */}
      <div className="px-3 py-2 border-b border-border flex-shrink-0">
        {post.description && (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-2">{post.description}</p>
        )}
        <div className="flex items-center gap-2">
          <button type="button"
            onClick={() => handleToggleReaction('❤️')}
            className={cn(
              'h-8 px-3 rounded-full flex items-center gap-1.5 text-sm transition-colors',
              heartReacted ? 'bg-red-500/15 text-red-500' : 'bg-muted hover:bg-muted/80 text-foreground'
            )}
          >
            <Heart className={cn('w-4 h-4', heartReacted && 'fill-current')} />
            <span className="font-medium tabular-nums">{heartCount}</span>
          </button>
          <div className="h-8 px-3 rounded-full bg-muted flex items-center gap-1.5 text-sm text-foreground">
            <MessageCircle className="w-4 h-4" />
            <span className="font-medium tabular-nums">{commentCount}</span>
          </div>
        </div>
      </div>

      {/* Comments */}
      <ScrollArea className="flex-1">
        <div className="p-3">
          <MediaComments postId={post.id} serverId={serverId} />
        </div>

      </ScrollArea>

      {editOpen && <EditMediaPostModal post={post} channelId={channelId} onClose={() => setEditOpen(false)} />}
    </div>
  );
}

