import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cacheGetSync, cacheSetAsync } from '@/lib/cache';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ForumComment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  parent_comment_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useForumComments(postId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery<ForumComment[]>({
    queryKey: ['forum-comments', postId],
    enabled: !!postId,
    placeholderData: () => (postId ? cacheGetSync(`forum-comments:${postId}`) : undefined),
    queryFn: async () => {
      const { data, error } = await (supabase.from('forum_post_comments' as any) as any)
        .select('*')
        .eq('post_id', postId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as ForumComment[];
    },
  });

  useEffect(() => {
    if (!postId) return;
    const ch = supabase
      .channel(`forum-comments:${postId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'forum_post_comments', filter: `post_id=eq.${postId}` },
        () => queryClient.invalidateQueries({ queryKey: ['forum-comments', postId] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [postId, queryClient]);

  useEffect(() => {
    if (query.data && postId && !query.isPlaceholderData) {
      cacheSetAsync(`forum-comments:${postId}`, query.data);
    }
  }, [query.data, postId, query.isPlaceholderData]);

  return query;
}

export function useCreateForumComment(postId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (content: string) => {
      if (!user) throw new Error('Not authenticated');
      const trimmed = content.trim();
      if (!trimmed) throw new Error('Le commentaire ne peut pas être vide');
      const { data, error } = await (supabase.from('forum_post_comments' as any) as any)
        .insert({ post_id: postId, author_id: user.id, content: trimmed })
        .select('*').single();
      if (error) throw error;
      return data as ForumComment;
    },
    onMutate: async (content: string) => {
      if (!user) return;
      await queryClient.cancelQueries({ queryKey: ['forum-comments', postId] });
      const previous = queryClient.getQueryData<ForumComment[]>(['forum-comments', postId]);
      const optimistic: ForumComment = {
        id: `temp-${Date.now()}`,
        post_id: postId,
        author_id: user.id,
        content: content.trim(),
        parent_comment_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      queryClient.setQueryData<ForumComment[]>(['forum-comments', postId], (old = []) => [...old, optimistic]);
      return { previous };
    },
    onError: (e: any, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['forum-comments', postId], ctx.previous);
      toast.error(e?.message ?? 'Erreur lors de l\'envoi');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-comments', postId] });
    },
  });
}

export function useDeleteForumComment(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await (supabase.from('forum_post_comments' as any) as any).delete().eq('id', commentId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['forum-comments', postId] }),
  });
}
