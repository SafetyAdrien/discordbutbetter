import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface MediaReaction {
  id: string;
  post_id: string;
  user_id: string;
  emoji: string;
  created_at: string | null;
}

export function useMediaPostReactions(postIds: string[]) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const idsKey = postIds.join(',');

  useEffect(() => {
    if (postIds.length === 0) return;
    const channel = supabase
      .channel(`media-reactions-rt-${postIds[0]}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'media_post_reactions' },
        (payload) => {
          const record = (payload.new || payload.old) as { post_id?: string; user_id?: string } | undefined;
          if (!record?.post_id) return;
          if (!postIds.includes(record.post_id)) return;
          if (user && record.user_id === user.id) return;
          clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['media-reactions'] });
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
    queryKey: ['media-reactions', postIds],
    queryFn: async () => {
      if (postIds.length === 0) return {};
      const { data, error } = await (supabase
        .from('media_post_reactions') as any)
        .select('*')
        .in('post_id', postIds);
      if (error) throw error;
      const grouped: Record<string, MediaReaction[]> = {};
      (data ?? []).forEach((r: MediaReaction) => {
        if (!grouped[r.post_id]) grouped[r.post_id] = [];
        grouped[r.post_id].push(r);
      });
      return grouped;
    },
    enabled: postIds.length > 0,
  });
}

export function useToggleMediaReaction() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, emoji, currentReactions }: {
      postId: string;
      emoji: string;
      currentReactions: MediaReaction[];
    }) => {
      if (!user) throw new Error('Not authenticated');
      const userHasReacted = currentReactions.some(
        r => r.user_id === user.id && r.emoji === emoji
      );
      if (userHasReacted) {
        const { error } = await (supabase
          .from('media_post_reactions') as any)
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id)
          .eq('emoji', emoji);
        if (error) throw error;
      } else {
        const { error } = await (supabase
          .from('media_post_reactions') as any)
          .insert({ post_id: postId, user_id: user.id, emoji });
        if (error) throw error;
      }
    },
    onMutate: async ({ postId, emoji, currentReactions }) => {
      if (!user) return;
      await queryClient.cancelQueries({ queryKey: ['media-reactions'] });
      const previous = queryClient.getQueriesData({ queryKey: ['media-reactions'] });
      const userHasReacted = currentReactions.some(
        r => r.user_id === user.id && r.emoji === emoji
      );
      queryClient.setQueriesData({ queryKey: ['media-reactions'] }, (old: Record<string, MediaReaction[]> | undefined) => {
        if (!old) return old;
        const list = old[postId] || [];
        const next = userHasReacted
          ? list.filter(r => !(r.user_id === user.id && r.emoji === emoji))
          : [...list, {
              id: `temp-${Date.now()}`,
              post_id: postId,
              user_id: user.id,
              emoji,
              created_at: new Date().toISOString(),
            }];
        return { ...old, [postId]: next };
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
      queryClient.invalidateQueries({ queryKey: ['media-reactions'] });
    },
  });
}
