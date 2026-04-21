import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Send, Trash2, Reply, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MarkdownText } from '@/lib/markdown';
import { useAuth } from '@/contexts/AuthContext';
import { ReactionBar } from '@/components/chat/ReactionBar';
import { RepliedLine } from '@/components/chat/RepliedLine';
import { useAnnouncementCommentReactions, useToggleCommentReaction } from '@/hooks/useCommentReactions';
import { useMembers } from '@/hooks/useMembers';
import type { AnnouncementComment } from '@/hooks/useAnnouncements';
import type { RepliedMessageRef } from '@/types/app';
import { cn } from '@/lib/utils';

interface AnnouncementCommentsProps {
  comments: AnnouncementComment[];
  onAddComment: (content: string, replyToId?: string | null) => void;
  onDeleteComment: (commentId: string) => void;
  serverId?: string | null;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'à l\'instant';
  if (diffMins < 60) return `il y a ${diffMins} min`;
  if (diffHours < 24) return `il y a ${diffHours}h`;
  if (diffDays < 7) return `il y a ${diffDays}j`;
  return date.toLocaleDateString('fr-FR');
}

function toRepliedRef(c: NonNullable<AnnouncementComment['repliedComment']>): RepliedMessageRef {
  return {
    id: c.id,
    content: c.content,
    deleted: c.deleted,
    author: c.author
      ? {
          id: c.author.id,
          username: c.author.display_name,
          displayName: c.author.display_name,
          avatar: c.author.avatar_url ?? undefined,
        }
      : null,
  };
}

export function AnnouncementComments({ comments, onAddComment, onDeleteComment, serverId = null }: AnnouncementCommentsProps) {
  const { user, profile } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<AnnouncementComment | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const commentRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const { data: membersData = [] } = useMembers(serverId || '');
  const memberTopRole = useMemo(() => {
    const map = new Map<string, { id: string; name: string; color?: string | null; icon_url?: string | null }>();
    for (const m of membersData) {
      const uid = (m as any).user?.id || (m as any).id;
      const roles = (((m as any).roles ?? []) as Array<{ id: string; name: string; color?: string | null; icon_url?: string | null; position?: number | null }>)
        .slice()
        .sort((a, b) => (b.position ?? 0) - (a.position ?? 0));
      if (roles[0]) map.set(uid, roles[0]);
    }
    return map;
  }, [membersData]);

  const commentIds = useMemo(() => comments.map(c => c.id), [comments]);
  const { data: reactionsData = {} } = useAnnouncementCommentReactions(commentIds);
  const toggleReaction = useToggleCommentReaction();

  const handleToggleReaction = (commentId: string, emoji: string) => {
    const currentReactions = reactionsData?.[commentId] || [];
    toggleReaction.mutate({ commentId, emoji, currentReactions });
  };

  const handleSubmit = () => {
    if (!newComment.trim()) return;
    onAddComment(newComment.trim(), replyingTo?.id ?? null);
    setNewComment('');
    setReplyingTo(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape' && replyingTo) {
      e.preventDefault();
      setReplyingTo(null);
    }
  };

  const handleStartReply = useCallback((c: AnnouncementComment) => {
    setReplyingTo(c);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const handleJump = useCallback((id: string) => {
    const el = commentRefs.current.get(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('highlight-pulse');
    setTimeout(() => el.classList.remove('highlight-pulse'), 1500);
  }, []);

  // Auto-clear reply if target was deleted
  useEffect(() => {
    if (replyingTo && !comments.find((c) => c.id === replyingTo.id)) {
      setReplyingTo(null);
    }
  }, [comments, replyingTo]);

  return (
    <div className="space-y-4">
      {/* Comments list */}
      <div className="space-y-3">
        {comments.map((comment) => (
          <div
            key={comment.id}
            ref={(el) => {
              if (el) commentRefs.current.set(comment.id, el);
              else commentRefs.current.delete(comment.id);
            }}
            className="rounded-lg transition-colors"
          >
            {comment.repliedComment && (() => {
              const citedAuthorId = comment.repliedComment.author?.id;
              const topRole = citedAuthorId ? memberTopRole.get(citedAuthorId) : undefined;
              return (
                <RepliedLine
                  repliedMessage={toRepliedRef(comment.repliedComment)}
                  onJump={handleJump}
                  indent={44}
                  authorColor={topRole?.color || undefined}
                  authorRole={topRole ?? null}
                  className="mb-1"
                />
              );
            })()}
            <div className="flex gap-3 group">
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarImage src={comment.author.avatar_url || undefined} />
                <AvatarFallback>{comment.author.display_name[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 bg-muted/30 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{comment.author.display_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(comment.created_at)}
                  </span>
                  <div className="ml-auto flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleStartReply(comment)}
                      className="p-1.5 hover:bg-accent rounded transition-colors"
                      aria-label={`Répondre à ${comment.author.display_name}`}
                      title="Répondre"
                    >
                      <Reply className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    {comment.author.id === user?.id && (
                      <button
                        onClick={() => onDeleteComment(comment.id)}
                        className="p-1.5 hover:bg-destructive/20 rounded transition-colors"
                        aria-label="Supprimer le commentaire"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="text-sm mt-1">
                  <MarkdownText content={comment.content} />
                </div>
                <div className="mt-2">
                  <ReactionBar
                    reactions={reactionsData[comment.id] || []}
                    onToggle={(emoji) => handleToggleReaction(comment.id, emoji)}
                    serverId={serverId}
                    size="sm"
                  />
                </div>
              </div>
            </div>
          </div>
        ))}

        {comments.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucun commentaire pour le moment
          </p>
        )}
      </div>

      {/* Reply preview bar */}
      {replyingTo && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/40 border border-border/60 text-xs">
          <Reply className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 -scale-x-100" />
          <Avatar className="w-4 h-4 flex-shrink-0">
            <AvatarImage src={replyingTo.author.avatar_url || undefined} />
            <AvatarFallback className="text-[8px]">
              {replyingTo.author.display_name[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="font-semibold flex-shrink-0">
            Réponse à <span className="text-primary">@{replyingTo.author.display_name}</span>
          </span>
          <span
            className="text-muted-foreground whitespace-nowrap overflow-hidden min-w-0 flex-1"
            style={{
              maskImage: 'linear-gradient(to right, black calc(100% - 24px), transparent)',
              WebkitMaskImage: 'linear-gradient(to right, black calc(100% - 24px), transparent)',
            }}
          >
            {replyingTo.content}
          </span>
          <button
            onClick={() => setReplyingTo(null)}
            className="p-1 hover:bg-accent rounded flex-shrink-0 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
            aria-label="Annuler la réponse"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* New comment input */}
      <div className="flex gap-3">
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarImage src={profile?.avatar_url || undefined} />
          <AvatarFallback>{profile?.display_name?.[0]?.toUpperCase() || '?'}</AvatarFallback>
        </Avatar>
        <div className="flex-1 flex gap-2">
          <Input
            ref={inputRef}
            placeholder={replyingTo ? `Répondre à @${replyingTo.author.display_name}...` : 'Ajouter un commentaire...'}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={500}
          />
          <Button onClick={handleSubmit} disabled={!newComment.trim()} size="icon">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
