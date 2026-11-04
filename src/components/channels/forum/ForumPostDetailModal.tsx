import { useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { X, MessageCircle, Send, Lock, Pin, Trash2, Tag as TagIcon } from '@/components/icons/discord/lucide';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
import { useAuth } from '@/contexts/AuthContext';
import { useForumComments, useCreateForumComment, useDeleteForumComment } from '@/hooks/useForumComments';
import { useDeleteForumPost, useToggleForumVote, type ForumPost } from '@/hooks/useForumPosts';
import { useHasChannelPermission } from '@/hooks/useUserChannelPermissions';

import { appLocale } from '@/i18n/locale';
interface Props {
  post: ForumPost;
  hasVoted: boolean;
  onClose: () => void;
}

function CommentRow({ comment, postId, canDelete }: { comment: any; postId: string; canDelete: boolean }) {
  const { data: profile } = useProfile(comment.author_id);
  const del = useDeleteForumComment(postId);
  return (
    <div className="group flex gap-3 px-4 py-2 hover:bg-muted/30">
      <Avatar className="w-8 h-8 mt-0.5">
        <AvatarImage src={profile?.avatar_url ?? undefined} />
        <AvatarFallback>{profile?.display_name?.[0] ?? '?'}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-medium text-sm">{profile?.display_name ?? 'Utilisateur'}</span>
          <span className="text-xs text-muted-foreground">{new Date(comment.created_at).toLocaleString(appLocale(), { dateStyle: 'short', timeStyle: 'short' })}</span>
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

export function ForumPostDetailModal({ post, hasVoted, onClose }: Props) {
  const { user } = useAuth();
  const { data: author } = useProfile(post.author_id);
  const { data: comments = [] } = useForumComments(post.id);
  const createComment = useCreateForumComment(post.id);
  const deletePost = useDeleteForumPost(post.channel_id);
  const toggleVote = useToggleForumVote(post.channel_id);
  const [replyText, setReplyText] = useState('');

  const canManageForum = useHasChannelPermission(post.channel_id, 'manage_forum_posts').data;
  const isAuthor = user?.id === post.author_id;
  const canDeletePost = isAuthor || canManageForum;

  const submitReply = () => {
    if (!replyText.trim()) return;
    createComment.mutate(replyText, {
      onSuccess: () => setReplyText(''),
    });
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl p-0 gap-0 h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-4 border-b border-border">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {post.is_pinned && <Badge variant="secondary" className="text-[10px]"><Pin className="w-3 h-3 mr-1" />Épinglé</Badge>}
              {post.is_locked && <Badge variant="outline" className="text-[10px]"><Lock className="w-3 h-3 mr-1" />Verrouillé</Badge>}
              {post.tags.map(t => (
                <Badge key={t} variant="outline" className="text-[10px]"><TagIcon className="w-3 h-3 mr-1" />{t}</Badge>
              ))}
            </div>
            <h2 className="text-xl font-semibold leading-tight">{post.title}</h2>
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <Avatar className="w-5 h-5"><AvatarImage src={author?.avatar_url ?? undefined} /><AvatarFallback>{author?.display_name?.[0] ?? '?'}</AvatarFallback></Avatar>
              <span>{author?.display_name ?? 'Utilisateur'}</span>
              <span>•</span>
              <span>{new Date(post.created_at).toLocaleString(appLocale())}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant={hasVoted ? 'default' : 'outline'}
              onClick={() => toggleVote.mutate({ postId: post.id, voted: hasVoted })}
              className="gap-1"
            >
              <ArrowUp className={cn('w-4 h-4', hasVoted && 'fill-current')} />
              {post.upvote_count}
            </Button>
            {canDeletePost && (
              <Button size="iconSm" variant="ghost" onClick={() => { if (confirm('Supprimer ce sujet ?')) { deletePost.mutate(post.id); onClose(); } }}>
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            <Button size="iconSm" variant="ghost" onClick={onClose}><X className="w-4 h-4" /></Button>
          </div>
        </div>

        {/* Body + comments */}
        <ScrollArea className="flex-1">
          {post.content && (
            <div className="p-4 border-b border-border">
              <p translate="no" className="text-sm whitespace-pre-wrap break-words">{post.content}</p>
            </div>
          )}
          <div className="px-4 py-2 text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1">
            <MessageCircle className="w-3.5 h-3.5" />
            {comments.length} {comments.length > 1 ? 'réponses' : 'réponse'}
          </div>
          <div>
            {comments.map((c) => (
              <CommentRow key={c.id} comment={c} postId={post.id} canDelete={user?.id === c.author_id || canManageForum} />
            ))}
            {comments.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">Aucune réponse pour le moment.</p>
            )}
          </div>
        </ScrollArea>

        {/* Composer */}
        {!post.is_locked ? (
          <div className="p-3 border-t border-border flex gap-2 items-end">
            <Textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); submitReply(); } }}
              placeholder="Répondre au sujet… (Ctrl+Entrée pour envoyer)"
              rows={2}
              className="resize-none"
              maxLength={4000}
            />
            <Button onClick={submitReply} disabled={!replyText.trim() || createComment.isPending}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="p-3 border-t border-border text-center text-sm text-muted-foreground">
            <Lock className="w-4 h-4 inline mr-1.5" /> Ce sujet est verrouillé
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
