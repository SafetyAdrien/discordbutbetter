import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface DuelVote {
  id: string;
  post_id: string;
  user_id: string;
  item_id: string;
  created_at: string;
}

export function useDuelVotes(postId: string | null) {
  const queryClient = useQueryClient();
  const key = ['duel-votes', postId];

  useEffect(() => {
    if (!postId) return;
    const channel = supabase
      .channel(`duel-votes-${postId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'media_post_duel_votes', filter: `post_id=eq.${postId}` },
        () => { queryClient.invalidateQueries({ queryKey: key }); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line
  }, [postId]);

  return useQuery({
    queryKey: key,
    enabled: !!postId,
    queryFn: async () => {
      const { data, error } = await (supabase.from('media_post_duel_votes') as any)
        .select('*')
        .eq('post_id', postId!);
      if (error) throw error;
      return (data ?? []) as DuelVote[];
    },
  });
}

export function useCastDuelVote() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, itemId }: { postId: string; itemId: string }) => {
      if (!user) throw new Error('Not authenticated');
      const key = ['duel-votes', postId];
      const current = queryClient.getQueryData<DuelVote[]>(key) ?? [];
      const mine = current.find((v) => v.user_id === user.id) ?? null;

      // Toggle off: same item clicked again → remove vote entirely
      if (mine && mine.item_id === itemId) {
        await (supabase.from('media_post_duel_votes') as any)
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
        return { action: 'removed' as const, postId, itemId };
      }

      // Switch or new vote
      await (supabase.from('media_post_duel_votes') as any)
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id);
      const { data, error } = await (supabase.from('media_post_duel_votes') as any)
        .insert({ post_id: postId, user_id: user.id, item_id: itemId })
        .select('*')
        .single();
      if (error) throw error;
      return { action: 'set' as const, vote: data as DuelVote };
    },
    onMutate: async ({ postId, itemId }) => {
      if (!user) return;
      const key = ['duel-votes', postId];
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData<DuelVote[]>(key) ?? [];
      const mine = prev.find((v) => v.user_id === user.id);
      const withoutMine = prev.filter((v) => v.user_id !== user.id);
      const next = mine && mine.item_id === itemId
        ? withoutMine
        : [
            ...withoutMine,
            { id: `temp-${Date.now()}`, post_id: postId, user_id: user.id, item_id: itemId, created_at: new Date().toISOString() },
          ];
      queryClient.setQueryData(key, next);
      return { prev };
    },
    onError: (_e, vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['duel-votes', vars.postId], ctx.prev);
    },
    onSettled: (_d, _e, vars) => {
      queryClient.invalidateQueries({ queryKey: ['duel-votes', vars.postId] });
    },
  });
}
