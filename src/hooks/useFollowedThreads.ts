import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Thread } from '@/types/thread';

export const useFollowedThreads = (channelId: string | undefined) => {
  const { user } = useAuth();
  
  const query = useQuery({
    queryKey: ['followed-threads', channelId, user?.id],
    queryFn: async () => {
      if (!channelId || !user) return [];
      
      const { data, error } = await supabase
        .from('thread_followers')
        .select(`
          thread_id,
          threads!inner(
            *,
            creator:profiles!threads_created_by_fkey(id, username, display_name, avatar_url)
          )
        `)
        .eq('user_id', user.id)
        .eq('threads.channel_id', channelId)
        .eq('threads.archived', false);

      if (error) throw error;
      
      const threads = (data || []).map(item => {
        const thread = item.threads as unknown as Thread;
        return thread;
      });
      
      const threadsWithCounts = await Promise.all(
        threads.map(async (thread) => {
          const { count } = await supabase
            .from('thread_messages')
            .select('*', { count: 'exact', head: true })
            .eq('thread_id', thread.id);
          
          return { ...thread, message_count: count || 0 } as Thread;
        })
      );
      
      return threadsWithCounts;
    },
    enabled: !!channelId && !!user,
    placeholderData: () => {
      try {
        const cached = sessionStorage.getItem(`cache:followed-threads:${channelId}:${user?.id}`);
        return cached ? JSON.parse(cached) : undefined;
      } catch { return undefined; }
    },
  });

  // Persist to sessionStorage
  useEffect(() => {
    if (query.data && channelId && user?.id && !query.isPlaceholderData) {
      try { sessionStorage.setItem(`cache:followed-threads:${channelId}:${user.id}`, JSON.stringify(query.data)); } catch {}
    }
  }, [query.data, channelId, user?.id, query.isPlaceholderData]);

  return query;
};

export const useAllFollowedThreadsForServer = (serverId: string | undefined) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['all-followed-threads', serverId, user?.id],
    queryFn: async () => {
      if (!serverId || !user) return [];
      
      // Récupérer tous les threads suivis par l'utilisateur pour ce serveur
      const { data, error } = await supabase
        .from('thread_followers')
        .select(`
          thread_id,
          threads!inner(
            *,
            creator:profiles!threads_created_by_fkey(id, username, display_name, avatar_url),
            channel:channels!threads_channel_id_fkey(id, name, server_id)
          )
        `)
        .eq('user_id', user.id)
        .eq('threads.archived', false);

      if (error) throw error;
      
      // Filtrer par server_id et extraire les threads
      const threads = (data || [])
        .map(item => item.threads as unknown as Thread & { channel: { id: string; name: string; server_id: string } })
        .filter(thread => thread.channel?.server_id === serverId);
      
      return threads;
    },
    enabled: !!serverId && !!user,
  });
};
