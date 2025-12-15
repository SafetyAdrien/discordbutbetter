import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Thread } from '@/types/thread';

export const useIsFollowingThread = (threadId: string | undefined) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['thread-follow', threadId, user?.id],
    queryFn: async () => {
      if (!threadId || !user) return false;
      
      const { data, error } = await supabase
        .from('thread_followers')
        .select('id')
        .eq('thread_id', threadId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!threadId && !!user,
  });
};

// Hook pour récupérer les threads suivis par l'utilisateur pour un serveur
export const useFollowedThreads = (serverId: string | undefined) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['followed-threads', serverId, user?.id],
    queryFn: async () => {
      if (!serverId || !user) return [];
      
      // Récupérer les threads suivis qui appartiennent aux channels du serveur
      const { data, error } = await supabase
        .from('thread_followers')
        .select(`
          thread_id,
          threads!inner (
            id,
            name,
            channel_id,
            created_at,
            created_by,
            archived,
            archived_at,
            last_message_at,
            message_id,
            channels!inner (
              server_id
            )
          )
        `)
        .eq('user_id', user.id)
        .eq('threads.channels.server_id', serverId)
        .eq('threads.archived', false);

      if (error) throw error;
      
      // Transformer les données en format Thread avec channel_id
      return (data || []).map(item => {
        const thread = item.threads as unknown as Thread & { channels: { server_id: string } };
        return {
          ...thread,
          parentChannelId: thread.channel_id,
        };
      });
    },
    enabled: !!serverId && !!user,
  });
};

export const useFollowThread = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (threadId: string) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('thread_followers')
        .insert({
          thread_id: threadId,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async (threadId) => {
      if (!user) return;
      
      await queryClient.cancelQueries({ queryKey: ['thread-follow', threadId, user.id] });
      const previousFollow = queryClient.getQueryData(['thread-follow', threadId, user.id]);
      
      queryClient.setQueryData(['thread-follow', threadId, user.id], true);
      
      return { previousFollow, threadId };
    },
    onError: (_, threadId, context) => {
      if (context?.previousFollow !== undefined && user) {
        queryClient.setQueryData(['thread-follow', threadId, user.id], context.previousFollow);
      }
      toast.error('Erreur lors du suivi du thread');
    },
    onSuccess: () => {
      toast.success('Thread suivi');
    },
    onSettled: (_, __, threadId) => {
      if (user) {
        queryClient.invalidateQueries({ queryKey: ['thread-follow', threadId, user.id] });
        queryClient.invalidateQueries({ queryKey: ['followed-threads'] });
      }
    },
  });
};

export const useUnfollowThread = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (threadId: string) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('thread_followers')
        .delete()
        .eq('thread_id', threadId)
        .eq('user_id', user.id);

      if (error) throw error;
      return { threadId };
    },
    onMutate: async (threadId) => {
      if (!user) return;
      
      await queryClient.cancelQueries({ queryKey: ['thread-follow', threadId, user.id] });
      const previousFollow = queryClient.getQueryData(['thread-follow', threadId, user.id]);
      
      queryClient.setQueryData(['thread-follow', threadId, user.id], false);
      
      return { previousFollow, threadId };
    },
    onError: (_, threadId, context) => {
      if (context?.previousFollow !== undefined && user) {
        queryClient.setQueryData(['thread-follow', threadId, user.id], context.previousFollow);
      }
      toast.error('Erreur lors de l\'arrêt du suivi');
    },
    onSuccess: () => {
      toast.success('Thread non suivi');
    },
    onSettled: (_, __, threadId) => {
      if (user) {
        queryClient.invalidateQueries({ queryKey: ['thread-follow', threadId, user.id] });
        queryClient.invalidateQueries({ queryKey: ['followed-threads'] });
      }
    },
  });
};
