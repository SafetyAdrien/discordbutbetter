import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, X, Trash2, EyeOff } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ReactionBar } from '@/components/chat/ReactionBar';
import { MediaComments } from './MediaComments';
import { useAuth } from '@/contexts/AuthContext';
import { useMediaPostReactions, useToggleMediaReaction } from '@/hooks/useMediaReactions';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import type { MediaPost } from '@/hooks/useMediaPosts';

interface MediaPostDetailModalProps {
  post: MediaPost;
  channelId: string;
  serverId?: string | null;
  authorName?: string;
  authorAvatarUrl?: string | null;
  onClose: () => void;
}

export function MediaPostDetailModal({
  post,
  channelId,
  serverId = null,
  authorName,
  authorAvatarUrl,
  onClose,
}: MediaPostDetailModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeIndex, setActiveIndex] = useState(0);
  const [revealed, setRevealed] = useState(!post.is_spoiler);

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

  // Reactions on the post
  const postIds = useMemo(() => [post.id], [post.id]);
  const { data: reactionsData = {} } = useMediaPostReactions(postIds);
  const toggleReaction = useToggleMediaReaction();

  const handleToggleReaction = (emoji: string) => {
    toggleReaction.mutate({
      postId: post.id,
      emoji,
      currentReactions: reactionsData?.[post.id] || [],
    });
  };

  // Keyboard nav
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && items.length > 1) {
        setActiveIndex((i) => (i - 1 + items.length) % items.length);
      } else if (e.key === 'ArrowRight' && items.length > 1) {
        setActiveIndex((i) => (i + 1) % items.length);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [items.length]);

  const handleDelete = async () => {
    if (!confirm('Supprimer ce post ?')) return;
    const { error } = await (supabase.from('media_posts') as any).delete().eq('id', post.id);
    if (error) {
      toast.error('Erreur lors de la suppression');
      return;
    }
    queryClient.setQueryData<MediaPost[]>(
      ['media-posts', channelId],
      (old = []) => old.filter((p) => p.id !== post.id)
    );
    toast.success('Post supprimé');
    onClose();
  };

  const isAuthor = user?.id === post.author_id;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl w-[95vw] h-[90vh] p-0 overflow-hidden flex flex-col md:flex-row gap-0">
        {/* Media side */}
        <div className="relative flex-1 min-w-0 bg-black flex items-center justify-center">
          {!revealed && post.is_spoiler ? (
            <button
              onClick={() => setRevealed(true)}
              className="flex flex-col items-center gap-3 text-white"
            >
              <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
                <EyeOff className="w-8 h-8" />
              </div>
              <span className="text-sm font-medium">Spoiler — cliquer pour afficher</span>
            </button>
          ) : isImage ? (
            <img
              src={activeItem.file_url}
              alt={activeItem.alt_text || post.title}
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <video
              src={activeItem.file_url}
              className="max-w-full max-h-full"
              controls
              autoPlay
            />
          )}

          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Carousel nav */}
          {items.length > 1 && revealed && (
            <>
              <button
                onClick={() => setActiveIndex((i) => (i - 1 + items.length) % items.length)}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setActiveIndex((i) => (i + 1) % items.length)}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 text-white text-xs font-medium">
                {activeIndex + 1} / {items.length}
              </div>
              {/* Thumbnail strip */}
              <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-1.5 max-w-[80%] overflow-x-auto px-2">
                {items.map((it, idx) => (
                  <button
                    key={it.id}
                    onClick={() => setActiveIndex(idx)}
                    className={cn(
                      'w-10 h-10 rounded overflow-hidden border-2 flex-shrink-0',
                      idx === activeIndex ? 'border-white' : 'border-transparent opacity-60 hover:opacity-100'
                    )}
                  >
                    {it.file_type === 'video' ? (
                      <video src={it.file_url} className="w-full h-full object-cover" muted />
                    ) : (
                      <img src={it.file_url} alt="" className="w-full h-full object-cover" />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-full md:w-96 flex flex-col bg-background border-l border-border">
          <div className="p-4 border-b border-border">
            <div className="flex items-start gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={authorAvatarUrl || undefined} />
                <AvatarFallback>{authorName?.[0]?.toUpperCase() || '?'}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{authorName || 'Utilisateur'}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(post.created_at).toLocaleString('fr-FR')}
                </p>
              </div>
              {isAuthor && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDelete}
                  className="h-8 w-8 text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
            <h2 className="font-bold mt-3">{post.title}</h2>
            {post.description && (
              <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                {post.description}
              </p>
            )}
            <div className="mt-3">
              <ReactionBar
                reactions={reactionsData[post.id] || []}
                onToggle={handleToggleReaction}
                serverId={serverId}
                size="sm"
              />
            </div>
          </div>

          {/* Comments */}
          <ScrollArea className="flex-1 p-4">
            <MediaComments postId={post.id} serverId={serverId} />
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
