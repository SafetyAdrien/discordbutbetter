import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useFavoriteFriendIds() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['friend-favorites', user?.id],
    queryFn: async (): Promise<string[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('friend_favorites' as any)
        .select('friend_user_id')
        .eq('user_id', user.id);
      if (error) throw error;
      return (data as any[] || []).map((r) => r.friend_user_id as string);
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`friend-favorites:${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friend_favorites', filter: `user_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['friend-favorites', user.id] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, queryClient]);

  return query;
}

export function useToggleFavoriteFriend() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ friendUserId, isFavorite }: { friendUserId: string; isFavorite: boolean }) => {
      if (!user) throw new Error('Not authenticated');
      if (isFavorite) {
        const { error } = await supabase
          .from('friend_favorites' as any)
          .delete()
          .eq('user_id', user.id)
          .eq('friend_user_id', friendUserId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('friend_favorites' as any)
          .insert({ user_id: user.id, friend_user_id: friendUserId } as any);
        if (error) throw error;
      }
    },
    onMutate: async ({ friendUserId, isFavorite }) => {
      if (!user) return;
      await queryClient.cancelQueries({ queryKey: ['friend-favorites', user.id] });
      const previous = queryClient.getQueryData<string[]>(['friend-favorites', user.id]) || [];
      queryClient.setQueryData<string[]>(
        ['friend-favorites', user.id],
        isFavorite ? previous.filter((id) => id !== friendUserId) : [...previous, friendUserId]
      );
      return { previous };
    },
    onError: (_, __, context) => {
      if (context?.previous && user) {
        queryClient.setQueryData(['friend-favorites', user.id], context.previous);
      }
      toast.error('Erreur lors de la mise à jour');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['friend-favorites'] });
    },
  });
}
