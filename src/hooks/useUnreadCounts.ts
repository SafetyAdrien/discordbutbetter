import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface UnreadCount {
  conversationId: string;
  count: number;
}

export function useUnreadCounts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['unread-counts', user?.id],
    queryFn: async (): Promise<Record<string, number>> => {
      if (!user) return {};

      // Get user's conversations
      const { data: participations, error: partError } = await supabase
        .from('dm_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (partError) throw partError;

      const conversationIds = participations?.map(p => p.conversation_id) || [];
      if (conversationIds.length === 0) return {};

      // Get read states
      const { data: readStates, error: readError } = await supabase
        .from('dm_read_states')
        .select('conversation_id, last_read_at')
        .eq('user_id', user.id)
        .in('conversation_id', conversationIds);

      if (readError) throw readError;

      // Create a map of read states
      const readStateMap: Record<string, string> = {};
      readStates?.forEach(rs => {
        readStateMap[rs.conversation_id] = rs.last_read_at || new Date(0).toISOString();
      });

      // Count unread messages per conversation
      const unreadCounts: Record<string, number> = {};

      await Promise.all(
        conversationIds.map(async (convId) => {
          const lastReadAt = readStateMap[convId] || new Date(0).toISOString();
          
          const { count, error } = await supabase
            .from('dm_messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', convId)
            .gt('created_at', lastReadAt)
            .neq('author_id', user.id);

          if (!error && count && count > 0) {
            unreadCounts[convId] = count;
          }
        })
      );

      return unreadCounts;
    },
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const markAsRead = useMutation({
    mutationFn: async (conversationId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('dm_read_states')
        .upsert({
          user_id: user.id,
          conversation_id: conversationId,
          last_read_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,conversation_id',
        });

      if (error) throw error;
      return conversationId;
    },
    onMutate: async (conversationId) => {
      await queryClient.cancelQueries({ queryKey: ['unread-counts', user?.id] });
      const previousCounts = queryClient.getQueryData<Record<string, number>>(['unread-counts', user?.id]);
      
      queryClient.setQueryData<Record<string, number>>(['unread-counts', user?.id], old => {
        if (!old) return {};
        const { [conversationId]: _, ...rest } = old;
        return rest;
      });
      
      return { previousCounts };
    },
    onError: (_, __, context) => {
      if (context?.previousCounts) {
        queryClient.setQueryData(['unread-counts', user?.id], context.previousCounts);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['unread-counts'] });
    },
  });

  return {
    unreadCounts: query.data || {},
    isLoading: query.isLoading,
    markAsRead,
  };
}
