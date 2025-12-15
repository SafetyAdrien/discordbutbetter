import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Thread } from '@/types/thread';

export function useFollowedThreads(channelId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['followed-threads', channelId, user?.id],
    queryFn: async () => {
      if (!channelId || !user) return [];

      // Fetch threads that the user follows for this channel
      const { data, error } = await supabase
        .from('thread_followers')
        .select(`
          thread:threads!inner(
            id,
            name,
            channel_id,
            message_id,
            created_by,
            created_at,
            last_message_at,
            archived,
            archived_at,
            creator:profiles!threads_created_by_fkey(
              id,
              username,
              display_name,
              avatar_url
            )
          )
        `)
        .eq('user_id', user.id)
        .eq('threads.channel_id', channelId)
        .eq('threads.archived', false);

      if (error) throw error;

      // Transform the data to match Thread type
      return (data || [])
        .map((item: any) => item.thread)
        .filter(Boolean) as Thread[];
    },
    enabled: !!channelId && !!user,
  });
}
