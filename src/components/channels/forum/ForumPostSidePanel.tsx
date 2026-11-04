import { useState, useEffect } from 'react';
import { ArrowUp, Archive, ArchiveRestore } from 'lucide-react';
import { X, MessageCircle, Send, Lock, Pin, Trash2, Tag as TagIcon } from '@/components/icons/discord/lucide';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useForumComments, useCreateForumComment, useDeleteForumComment } from '@/hooks/useForumComments';
import {
  useDeleteForumPost, useToggleForumVote, useUpdateForumPost, type ForumPost,
} from '@/hooks/useForumPosts';
import { useHasChannelPermission } from '@/hooks/useUserChannelPermissions';

import { appLocale } from '@/i18n/locale';
import { ForumEmoji } from './ForumEmoji';
function useProfile(userId: string | undefined) {
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

interface Props {
  post: ForumPost;
  hasVoted?: boolean;
  onClose: () => void;
  /**
   * Resolved tag entities for this post (ids from public.forum_tags, with their
   * emoji). When omitted, the panel falls back to the legacy free-text tags.
   */
  tags?: Array<{ id: string; name: string; emoji_name: string | null }>;
}

function CommentRow({ comment, postId, canDelete }: { comment: any; postId: string; canDelete: boolean }) {
  const { data: profile } = useProfile(comment.author_id);
  const del = useDeleteForumComment(postId);
  return (
    <div className="group flex gap-3 px-3 py-2 hover:bg-muted/30 rounded-md">
      <Avatar className="w-8 h-8 mt-0.5">
        <AvatarImage src={profile?.avatar_url ?? undefined} />
        <AvatarFallback>{profile?.display_name?.[0] ?? '?'}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-medium text-sm">{profile?.display_name ?? 'Utilisateur'}</span>
          <span className="text-xs text-muted-foreground">
            {new Date(comment.created_at).toLocaleString(appLocale(), { dateStyle: 'short', timeStyle: 'short' })}
          </span>
        </div>
        <p className="text-sm whitespace-pre-wrap break-words">{comment.content}</p>
      </div>
      {canDelete && (
        <button type="button"
          onClick={() => del.mutate(comment.id)}
          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
          aria-label="Supprimer"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export function ForumPostSidePanel({ post, hasVoted = false, onClose, tags }: Props) {
  const { user } = useAuth();
  const { data: author } = useProfile(post.author_id);
  const { data: comments = [] } = useForumComments(post.id);
  const createComment = useCreateForumComment(post.id);
  const deletePost = useDeleteForumPost(post.channel_id);
  const toggleVote = useToggleForumVote(post.channel_id);
  // Pin / lock / archive: the columns and their RLS already existed but nothing
  // ever wrote them, so the badges were effectively read-only.
  const updatePost = useUpdateForumPost(post.channel_id);
  const [replyText, setReplyText] = useState('');

  const canManageForum = useHasChannelPermission(post.channel_id, 'manage_forum_posts').data;
  const isAuthor = user?.id === post.author_id;
  const canDeletePost = isAuthor || canManageForum;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submitReply = () => {
    if (!replyText.trim()) return;
    createComment.mutate(replyText, { onSuccess: () => setReplyText('') });
  };

  return (
    <div className="h-full flex flex-col bg-background border-l border-border">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-border flex items-start gap-2 flex-shrink-0">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            {post.is_pinned && <Badge variant="secondary" className="text-[10px]"><Pin className="w-3 h-3 mr-1" />Épinglé</Badge>}
            {post.is_locked && <Badge variant="outline" className="text-[10px]"><Lock className="w-3 h-3 mr-1" />Verrouillé</Badge>}
            {(tags ?? post.tags.map((t) => ({ id: t, name: t, emoji_name: null }))).map(t => (
              <Badge key={t.id} variant="outline" className="text-[10px]">
                {t.emoji_name ? <ForumEmoji emoji={t.emoji_name} className="mr-1" /> : <TagIcon className="w-3 h-3 mr-1" />}
                {t.name}
              </Badge>
            ))}
          </div>
          <h2 className="text-base font-semibold leading-tight truncate">{post.title}</h2>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
            <Avatar className="w-4 h-4"><AvatarImage src={author?.avatar_url ?? undefined} /><AvatarFallback>{author?.display_name?.[0] ?? '?'}</AvatarFallback></Avatar>
            <span className="truncate">{author?.display_name ?? 'Utilisateur'}</span>
            <span>·</span>
            <span>{new Date(post.created_at).toLocaleString(appLocale(), { dateStyle: 'short', timeStyle: 'short' })}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            size="sm"
            variant={hasVoted ? 'default' : 'outline'}
            onClick={() => toggleVote.mutate({ postId: post.id, voted: hasVoted })}
            className="gap-1 h-8"
          >
            <ArrowUp className={cn('w-3.5 h-3.5', hasVoted && 'fill-current')} />
            {post.upvote_count}
          </Button>
          {canManageForum && (
            <>
              <Button
                size="icon"
                variant="ghost"
                className={cn('h-8 w-8', post.is_pinned && 'text-primary')}
                onClick={() => updatePost.mutate({ postId: post.id, is_pinned: !post.is_pinned })}
                aria-label={post.is_pinned ? 'Désépingler' : 'Épingler'}
                title={post.is_pinned ? 'Désépingler' : 'Épingler'}
              >
                <Pin className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className={cn('h-8 w-8', post.is_locked && 'text-primary')}
                onClick={() => updatePost.mutate({ postId: post.id, is_locked: !post.is_locked })}
                aria-label={post.is_locked ? 'Déverrouiller' : 'Verrouiller'}
                title={post.is_locked ? 'Déverrouiller' : 'Verrouiller'}
              >
                <Lock className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className={cn('h-8 w-8', post.archived && 'text-primary')}
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
          {canDeletePost && (
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { if (confirm('Supprimer ce sujet ?')) { deletePost.mutate(post.id); onClose(); } }}>
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Body + comments */}
      <ScrollArea className="flex-1">
        {post.content && (
          <div className="px-3 py-3 border-b border-border">
            <p translate="no" className="text-sm whitespace-pre-wrap break-words">{post.content}</p>
          </div>
        )}
        <div className="px-3 pt-3 pb-1 text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1">
          <MessageCircle className="w-3.5 h-3.5" />
          {comments.length} {comments.length > 1 ? 'réponses' : 'réponse'}
        </div>
        <div className="px-1 pb-3">
          {comments.map((c) => (
            <CommentRow key={c.id} comment={c} postId={post.id} canDelete={user?.id === c.author_id || canManageForum} />
          ))}
          {comments.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">Aucune réponse pour le moment.</p>
          )}
        </div>
      </ScrollArea>

      {/* Composer */}
      {!post.is_locked ? (
        <div className="p-2.5 border-t border-border flex gap-2 items-end flex-shrink-0">
          <Textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); submitReply(); } }}
            placeholder="Répondre… (Ctrl+Entrée)"
            rows={2}
            className="resize-none"
            maxLength={4000}
          />
          <Button onClick={submitReply} disabled={!replyText.trim() || createComment.isPending} size="icon">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div className="p-3 border-t border-border text-center text-sm text-muted-foreground flex-shrink-0">
          <Lock className="w-4 h-4 inline mr-1.5" /> Ce sujet est verrouillé
        </div>
      )}
    </div>
  );
}
