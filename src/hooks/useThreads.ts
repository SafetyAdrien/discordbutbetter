import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Thread } from '@/types/thread';
import { toast } from 'sonner';

export const useThreads = (channelId: string | undefined) => {
  return useQuery({
    queryKey: ['threads', channelId],
    queryFn: async () => {
      if (!channelId) return [];
      
      const { data, error } = await supabase
        .from('threads')
        .select(`
          *,
          creator:profiles!threads_created_by_fkey(id, username, display_name, avatar_url)
        `)
        .eq('channel_id', channelId)
        .eq('archived', false)
        .order('last_message_at', { ascending: false });

      if (error) throw error;
      
      // Get message counts
      const threadsWithCounts = await Promise.all(
        (data || []).map(async (thread) => {
          const { count } = await supabase
            .from('thread_messages')
            .select('*', { count: 'exact', head: true })
            .eq('thread_id', thread.id);
          
          return { ...thread, message_count: count || 0 } as Thread;
        })
      );
      
      return threadsWithCounts;
    },
    enabled: !!channelId,
  });
};

export const useThread = (threadId: string | undefined) => {
  return useQuery({
    queryKey: ['thread', threadId],
    queryFn: async () => {
      if (!threadId) return null;
      
      const { data, error } = await supabase
        .from('threads')
        .select(`
          *,
          creator:profiles!threads_created_by_fkey(id, username, display_name, avatar_url)
        `)
        .eq('id', threadId)
        .single();

      if (error) throw error;
      return data as Thread;
    },
    enabled: !!threadId,
  });
};

export const useCreateThread = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ channelId, name, messageId }: { channelId: string; name: string; messageId?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('threads')
        .insert({
          channel_id: channelId,
          name,
          created_by: user.id,
          message_id: messageId || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['threads', data.channel_id] });
      toast.success('Thread créé');
    },
    onError: () => {
      toast.error('Erreur lors de la création du thread');
    },
  });
};

export const useArchiveThread = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (threadId: string) => {
      const { error } = await supabase
        .from('threads')
        .update({ archived: true, archived_at: new Date().toISOString() })
        .eq('id', threadId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['threads'] });
      toast.success('Thread archivé');
    },
    onError: () => {
      toast.error('Erreur lors de l\'archivage');
    },
  });
};

export const useDeleteThread = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (threadId: string) => {
      const { error } = await supabase
        .from('threads')
        .delete()
        .eq('id', threadId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['threads'] });
      toast.success('Thread supprimé');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    },
  });
};
