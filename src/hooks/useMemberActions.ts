import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useKickMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ serverId, userId }: { serverId: string; userId: string }) => {
      const { error } = await supabase.rpc('kick_member', {
        _server_id: serverId,
        _user_id: userId,
      });
      if (error) throw error;
      return { serverId };
    },
    onMutate: async ({ serverId, userId }) => {
      await queryClient.cancelQueries({ queryKey: ['members', serverId] });
      const previousMembers = queryClient.getQueryData(['members', serverId]);
      
      queryClient.setQueryData(['members', serverId], (old: any[] | undefined) => 
        old?.filter(m => m.user?.id !== userId) || []
      );
      
      return { previousMembers };
    },
    onSuccess: (_, { serverId }) => {
      queryClient.invalidateQueries({ queryKey: ['members', serverId] });
      toast.success('Membre expulsé');
    },
    onError: (error, { serverId }, context) => {
      if (context?.previousMembers) {
        queryClient.setQueryData(['members', serverId], context.previousMembers);
      }
      toast.error('Erreur lors de l\'expulsion: ' + (error as Error).message);
    },
  });
}

export function useBanMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      serverId, 
      userId, 
      reason 
    }: { 
      serverId: string; 
      userId: string; 
      reason?: string;
    }) => {
      const { error } = await supabase.rpc('ban_member', {
        _server_id: serverId,
        _user_id: userId,
        _reason: reason || null,
      });
      if (error) throw error;
      return { serverId };
    },
    onMutate: async ({ serverId, userId }) => {
      await queryClient.cancelQueries({ queryKey: ['members', serverId] });
      const previousMembers = queryClient.getQueryData(['members', serverId]);
      
      queryClient.setQueryData(['members', serverId], (old: any[] | undefined) => 
        old?.filter(m => m.user?.id !== userId) || []
      );
      
      return { previousMembers };
    },
    onSuccess: (_, { serverId }) => {
      queryClient.invalidateQueries({ queryKey: ['members', serverId] });
      toast.success('Membre banni');
    },
    onError: (error, { serverId }, context) => {
      if (context?.previousMembers) {
        queryClient.setQueryData(['members', serverId], context.previousMembers);
      }
      toast.error('Erreur lors du bannissement: ' + (error as Error).message);
    },
  });
}
