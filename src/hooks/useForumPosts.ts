import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cacheGetSync, cacheSetAsync } from '@/lib/cache';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ForumPost {
  id: string;
  channel_id: string;
  server_id: string;
  author_id: string;
  title: string;
  content: string | null;
  tags: string[];
  is_pinned: boolean;
  is_locked: boolean;
  comment_count: number;
  upvote_count: number;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
  _isPending?: boolean;
}

export function useForumPosts(channelId: string) {
  const queryClient = useQueryClient();

  const query = useQuery<ForumPost[]>({
    queryKey: ['forum-posts', channelId],
    placeholderData: () => cacheGetSync(`forum-posts:${channelId}`),
    enabled: !!channelId,
    queryFn: async () => {
      const { data, error } = await (supabase.from('forum_posts' as any) as any)
        .select('*')
        .eq('channel_id', channelId)
        .order('is_pinned', { ascending: false })
        .order('last_activity_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ForumPost[];
    },
  });

  useEffect(() => {
    if (!channelId) return;
    const ch = supabase
      .channel(`forum-posts:${channelId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'forum_posts', filter: `channel_id=eq.${channelId}` },
        () => queryClient.invalidateQueries({ queryKey: ['forum-posts', channelId] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [channelId, queryClient]);

  return query;
}

export function useCreateForumPost(channelId: string, serverId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: { title: string; content: string; tags: string[] }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await (supabase.from('forum_posts' as any) as any)
        .insert({
          channel_id: channelId,
          server_id: serverId,
          author_id: user.id,
          title: input.title.trim(),
          content: input.content.trim() || null,
          tags: input.tags,
        })
        .select('*')
        .single();
      if (error) throw error;
      return data as ForumPost;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-posts', channelId] });
    },
    onError: (e: any) => toast.error(e?.message ?? 'Erreur lors de la création du sujet'),
  });
}

export function useDeleteForumPost(channelId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await (supabase.from('forum_posts' as any) as any).delete().eq('id', postId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['forum-posts', channelId] }),
    onError: (e: any) => toast.error(e?.message ?? 'Suppression impossible'),
  });
}

export function useToggleForumVote(channelId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ postId, voted }: { postId: string; voted: boolean }) => {
      if (!user) throw new Error('Not authenticated');
      if (voted) {
        const { error } = await (supabase.from('forum_post_votes' as any) as any)
          .delete().eq('post_id', postId).eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from('forum_post_votes' as any) as any)
          .insert({ post_id: postId, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-posts', channelId] });
      queryClient.invalidateQueries({ queryKey: ['forum-votes', channelId] });
    },
  });
}

export function useForumVotes(channelId: string, postIds: string[]) {
  const { user } = useAuth();
  return useQuery<Set<string>>({
    queryKey: ['forum-votes', channelId, user?.id, postIds.length],
    enabled: !!user && postIds.length > 0,
    queryFn: async () => {
      if (!user) return new Set();
      const { data, error } = await (supabase.from('forum_post_votes' as any) as any)
        .select('post_id')
        .in('post_id', postIds)
        .eq('user_id', user.id);
      if (error) throw error;
      return new Set((data ?? []).map((r: any) => r.post_id as string));
    },
  });
}
