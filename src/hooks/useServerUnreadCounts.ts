import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useServerUnreadCounts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['server-unread-counts', user?.id],
    queryFn: async (): Promise<Record<string, number>> => {
      if (!user) return {};

      // Get user's servers
      const { data: memberships } = await supabase
        .from('server_members')
        .select('server_id')
        .eq('user_id', user.id);

      const serverIds = memberships?.map(m => m.server_id) || [];
      if (serverIds.length === 0) return {};

      // Get read states for each server
      const { data: readStates } = await supabase
        .from('server_read_states')
        .select('server_id, last_read_at')
        .eq('user_id', user.id)
        .in('server_id', serverIds);

      const readStateMap: Record<string, string> = {};
      readStates?.forEach(rs => {
        readStateMap[rs.server_id] = rs.last_read_at || new Date(0).toISOString();
      });

      // Count unread messages per server
      const unreadCounts: Record<string, number> = {};

      await Promise.all(
        serverIds.map(async (serverId) => {
          const lastReadAt = readStateMap[serverId] || new Date(0).toISOString();
          
          // Get channels for this server
          const { data: channels } = await supabase
            .from('channels')
            .select('id')
            .eq('server_id', serverId);

          const channelIds = channels?.map(c => c.id) || [];
          if (channelIds.length === 0) return;

          // Count messages after last_read_at (excluding own messages)
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .in('channel_id', channelIds)
            .gt('created_at', lastReadAt)
            .neq('author_id', user.id);

          if (count && count > 0) {
            unreadCounts[serverId] = count;
          }
        })
      );

      return unreadCounts;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const markAsRead = useMutation({
    mutationFn: async (serverId: string) => {
      if (!user) throw new Error('Not authenticated');
      await supabase
        .from('server_read_states')
        .upsert({
          user_id: user.id,
          server_id: serverId,
          last_read_at: new Date().toISOString(),
        }, { onConflict: 'user_id,server_id' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['server-unread-counts'] });
    },
  });

  return {
    unreadCounts: query.data || {},
    isLoading: query.isLoading,
    markServerAsRead: markAsRead.mutate,
  };
}
