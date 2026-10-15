import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cacheGetSync, cacheSetAsync } from '@/lib/cache';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ForumPost {
  id: string;
  channel_id: string;
  /** Ids from public.forum_tags (Fluxer: max 5). Null for legacy rows. */
  applied_tags?: string[] | null;
  archived?: boolean;
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
  const instanceIdRef = useRef(Math.random().toString(36).slice(2));

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
      .channel(`forum-posts:${channelId}-${instanceIdRef.current}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'forum_posts', filter: `channel_id=eq.${channelId}` },
        () => queryClient.invalidateQueries({ queryKey: ['forum-posts', channelId] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [channelId, queryClient]);

  // Persist to cache for instant rehydration
  useEffect(() => {
    if (query.data && channelId && !query.isPlaceholderData) {
      cacheSetAsync(`forum-posts:${channelId}`, query.data);
    }
  }, [query.data, channelId, query.isPlaceholderData]);

  return query;
}

export function useCreateForumPost(channelId: string, serverId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: { title: string; content: string; tags: string[]; appliedTags?: string[] }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await (supabase.from('forum_posts' as any) as any)
        .insert({
          channel_id: channelId,
          server_id: serverId,
          author_id: user.id,
          title: input.title.trim(),
          content: input.content.trim() || null,
          tags: input.tags,
          // Ids of public.forum_tags entities (Fluxer: max 5 per post).
          applied_tags: input.appliedTags ?? [],
        })
        .select('*')
        .single();
      if (error) throw error;
      return data as ForumPost;
    },
    onMutate: async (input) => {
      if (!user) return;
      await queryClient.cancelQueries({ queryKey: ['forum-posts', channelId] });
      const previous = queryClient.getQueryData<ForumPost[]>(['forum-posts', channelId]);
      const optimisticId = `temp-${crypto.randomUUID()}`;
      const now = new Date().toISOString();
      const optimistic: ForumPost = {
        id: optimisticId,
        channel_id: channelId,
        server_id: serverId,
        author_id: user.id,
        title: input.title.trim(),
        content: input.content.trim() || null,
        tags: input.tags,
        applied_tags: input.appliedTags ?? [],
        archived: false,
        is_pinned: false,
        is_locked: false,
        comment_count: 0,
        upvote_count: 0,
        last_activity_at: now,
        created_at: now,
        updated_at: now,
        _isPending: true,
      };
      queryClient.setQueryData<ForumPost[]>(
        ['forum-posts', channelId],
        (old = []) => [optimistic, ...old],
      );
      return { previous, optimisticId };
    },
    onSuccess: (data, _input, ctx) => {
      queryClient.setQueryData<ForumPost[]>(['forum-posts', channelId], (old = []) => {
        const withoutOpt = old.filter(p => p.id !== ctx?.optimisticId);
        if (withoutOpt.some(p => p.id === data.id)) return withoutOpt;
        return [data, ...withoutOpt];
      });
      queryClient.invalidateQueries({ queryKey: ['forum-posts', channelId] });
    },
    onError: (e: any, _i, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['forum-posts', channelId], ctx.previous);
      toast.error(e?.message ?? 'Erreur lors de la création du sujet');
    },
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

/**
 * Moderator actions on a post: pin, lock, archive.
 *
 * The `is_pinned` / `is_locked` columns and their RLS policies already existed,
 * but nothing ever wrote them — the badges were read-only. Optimistic so the row
 * responds immediately; RLS still has the final say on the write.
 */
export function useUpdateForumPost(channelId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      postId,
      ...patch
    }: {
      postId: string;
      is_pinned?: boolean;
      is_locked?: boolean;
      archived?: boolean;
    }) => {
      const { error } = await (supabase.from('forum_posts' as any) as any)
        .update(patch)
        .eq('id', postId);
      if (error) throw error;
      return patch;
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['forum-posts', channelId] });
      const previous = queryClient.getQueryData<ForumPost[]>(['forum-posts', channelId]);
      queryClient.setQueryData<ForumPost[]>(['forum-posts', channelId], (old) =>
        (old ?? []).map((p) =>
          p.id === variables.postId
            ? {
                ...p,
                ...(variables.is_pinned !== undefined ? { is_pinned: variables.is_pinned } : {}),
                ...(variables.is_locked !== undefined ? { is_locked: variables.is_locked } : {}),
                ...(variables.archived !== undefined ? { archived: variables.archived } : {}),
              }
            : p,
        ),
      );
      return { previous };
    },
    onError: (error: any, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['forum-posts', channelId], context.previous);
      }
      toast.error(error?.message ?? 'Action impossible');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-posts', channelId] });
    },
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
