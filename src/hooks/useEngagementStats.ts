import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cacheGetSync, cacheSetAsync } from '@/lib/cache';
import { useAuth } from '@/contexts/AuthContext';

export function useEngagementStats(serverId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Realtime subscription for messages INSERT
  useEffect(() => {
    if (!serverId) return;

    const channel = supabase
      .channel(`engagement-stats-${serverId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['engagement-stats', serverId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [serverId, queryClient]);

  const query = useQuery({
    queryKey: ['engagement-stats', serverId],
    placeholderData: () => cacheGetSync(`engagement-stats:${serverId}`),
    queryFn: async () => {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      const { data: channels } = await supabase
        .from('channels')
        .select('id')
        .eq('server_id', serverId);

      const channelIds = channels?.map(c => c.id) || [];

      if (channelIds.length === 0) {
        return {
          activeMembers: 0,
          messagesThisWeek: 0,
          reactionsThisWeek: 0,
          growthThisMonth: 0,
        };
      }

      const { count: messagesCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .in('channel_id', channelIds)
        .gte('created_at', oneWeekAgo.toISOString());

      const { data: activeAuthors } = await supabase
        .from('messages')
        .select('author_id')
        .in('channel_id', channelIds)
        .gte('created_at', oneWeekAgo.toISOString());

      const uniqueActiveMembers = new Set(activeAuthors?.map(m => m.author_id) || []);

      const { data: messageIds } = await supabase
        .from('messages')
        .select('id')
        .in('channel_id', channelIds);

      const msgIds = messageIds?.map(m => m.id) || [];
      
      let reactionsCount = 0;
      if (msgIds.length > 0) {
        const { count } = await supabase
          .from('reactions')
          .select('*', { count: 'exact', head: true })
          .in('message_id', msgIds)
          .gte('created_at', oneWeekAgo.toISOString());
        reactionsCount = count || 0;
      }

      const { count: newMembersCount } = await supabase
        .from('server_members')
        .select('*', { count: 'exact', head: true })
        .eq('server_id', serverId)
        .gte('joined_at', oneMonthAgo.toISOString());

      return {
        activeMembers: uniqueActiveMembers.size,
        messagesThisWeek: messagesCount || 0,
        reactionsThisWeek: reactionsCount,
        growthThisMonth: newMembersCount || 0,
      };
    },
    enabled: !!serverId && !!user,
    refetchInterval: 60000,
  });

  // Persist to sessionStorage
  useEffect(() => {
    if (query.data && serverId && !query.isPlaceholderData) {
      try { sessionStorage.setItem(`cache:engagement-stats:${serverId}`, JSON.stringify(query.data)); } catch {}
    }
  }, [query.data, serverId, query.isPlaceholderData]);

  return query;
}
