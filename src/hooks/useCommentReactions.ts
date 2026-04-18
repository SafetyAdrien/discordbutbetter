import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface CommentReaction {
  id: string;
  comment_id: string;
  user_id: string;
  emoji: string;
  created_at: string | null;
}

export function useAnnouncementCommentReactions(commentIds: string[]) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const idsKey = commentIds.join(',');

  useEffect(() => {
    if (commentIds.length === 0) return;
    const channel = supabase
      .channel(`comment-reactions-rt-${commentIds[0]}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'announcement_comment_reactions' },
        (payload) => {
          const record = (payload.new || payload.old) as { comment_id?: string; user_id?: string } | undefined;
          if (!record?.comment_id) return;
          if (!commentIds.includes(record.comment_id)) return;
          if (user && record.user_id === user.id) return;
          clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['comment-reactions'] });
          }, 300);
        }
      )
      .subscribe();
    return () => {
      clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [idsKey, user?.id, queryClient]);

  return useQuery({
    queryKey: ['comment-reactions', commentIds],
    queryFn: async () => {
      if (commentIds.length === 0) return {};
      const { data, error } = await (supabase
        .from('announcement_comment_reactions') as any)
        .select('*')
        .in('comment_id', commentIds);
      if (error) throw error;
      const grouped: Record<string, CommentReaction[]> = {};
      (data ?? []).forEach((r: CommentReaction) => {
        if (!grouped[r.comment_id]) grouped[r.comment_id] = [];
        grouped[r.comment_id].push(r);
      });
      return grouped;
    },
    enabled: commentIds.length > 0,
  });
}

export function useToggleCommentReaction() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, emoji, currentReactions }: {
      commentId: string;
      emoji: string;
      currentReactions: CommentReaction[];
    }) => {
      if (!user) throw new Error('Not authenticated');
      const userHasReacted = currentReactions.some(
        r => r.user_id === user.id && r.emoji === emoji
      );
      if (userHasReacted) {
        const { error } = await (supabase
          .from('announcement_comment_reactions') as any)
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id)
          .eq('emoji', emoji);
        if (error) throw error;
      } else {
        const { error } = await (supabase
          .from('announcement_comment_reactions') as any)
          .insert({ comment_id: commentId, user_id: user.id, emoji });
        if (error) throw error;
      }
    },
    onMutate: async ({ commentId, emoji, currentReactions }) => {
      if (!user) return;
      await queryClient.cancelQueries({ queryKey: ['comment-reactions'] });
      const previous = queryClient.getQueriesData({ queryKey: ['comment-reactions'] });
      const userHasReacted = currentReactions.some(
        r => r.user_id === user.id && r.emoji === emoji
      );
      queryClient.setQueriesData({ queryKey: ['comment-reactions'] }, (old: Record<string, CommentReaction[]> | undefined) => {
        if (!old) return old;
        const list = old[commentId] || [];
        const next = userHasReacted
          ? list.filter(r => !(r.user_id === user.id && r.emoji === emoji))
          : [...list, {
              id: `temp-${Date.now()}`,
              comment_id: commentId,
              user_id: user.id,
              emoji,
              created_at: new Date().toISOString(),
            }];
        return { ...old, [commentId]: next };
      });
      return { previous };
    },
    onError: (_, __, context) => {
      if (context?.previous) {
        context.previous.forEach(([key, data]) => queryClient.setQueryData(key, data));
      }
      toast.error('Erreur lors de la réaction');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['comment-reactions'] });
    },
  });
}
