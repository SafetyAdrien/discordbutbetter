import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useEngagementStats(serverId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['engagement-stats', serverId],
    queryFn: async () => {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      // Get all channels for this server
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

      // Messages this week
      const { count: messagesCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .in('channel_id', channelIds)
        .gte('created_at', oneWeekAgo.toISOString());

      // Active members (unique authors this week)
      const { data: activeAuthors } = await supabase
        .from('messages')
        .select('author_id')
        .in('channel_id', channelIds)
        .gte('created_at', oneWeekAgo.toISOString());

      const uniqueActiveMembers = new Set(activeAuthors?.map(m => m.author_id) || []);

      // Reactions this week
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

      // Growth this month (new members)
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
    refetchInterval: 60000, // Refresh every minute
  });
}
