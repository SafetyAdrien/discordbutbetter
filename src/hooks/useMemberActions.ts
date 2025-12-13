import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface BannedMember {
  id: string;
  user_id: string;
  reason: string | null;
  created_at: string | null;
  banned_by: string | null;
  profile: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
}

export function useBannedMembers(serverId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['banned-members', serverId],
    queryFn: async (): Promise<BannedMember[]> => {
      const { data, error } = await supabase
        .from('server_bans')
        .select(`
          id,
          user_id,
          reason,
          created_at,
          banned_by,
          profile:profiles!server_bans_user_id_fkey (id, username, display_name, avatar_url)
        `)
        .eq('server_id', serverId);

      if (error) throw error;
      return (data as unknown as BannedMember[]) || [];
    },
    enabled: !!serverId && !!user,
  });
}

export function useUnbanMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ serverId, userId }: { serverId: string; userId: string }) => {
      const { error } = await supabase.rpc('unban_member', {
        _server_id: serverId,
        _user_id: userId,
      });
      if (error) throw error;
      return { serverId, userId };
    },
    onMutate: async ({ serverId, userId }) => {
      await queryClient.cancelQueries({ queryKey: ['banned-members', serverId] });
      const previousBanned = queryClient.getQueryData(['banned-members', serverId]);
      
      queryClient.setQueryData(['banned-members', serverId], (old: BannedMember[] | undefined) =>
        old?.filter(b => b.user_id !== userId)
      );
      
      return { previousBanned };
    },
    onError: (error, variables, context) => {
      if (context?.previousBanned) {
        queryClient.setQueryData(['banned-members', variables.serverId], context.previousBanned);
      }
      toast.error('Erreur lors du débannissement: ' + (error as Error).message);
    },
    onSuccess: () => {
      toast.success('Membre débanni');
    },
    onSettled: (_, __, { serverId }) => {
      queryClient.invalidateQueries({ queryKey: ['banned-members', serverId] });
    },
  });
}

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
    onError: (error, { serverId }, context) => {
      if (context?.previousMembers) {
        queryClient.setQueryData(['members', serverId], context.previousMembers);
      }
      toast.error('Erreur lors de l\'expulsion: ' + (error as Error).message);
    },
    onSuccess: () => {
      toast.success('Membre expulsé');
    },
    onSettled: (_, __, { serverId }) => {
      queryClient.invalidateQueries({ queryKey: ['members', serverId] });
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
    onError: (error, { serverId }, context) => {
      if (context?.previousMembers) {
        queryClient.setQueryData(['members', serverId], context.previousMembers);
      }
      toast.error('Erreur lors du bannissement: ' + (error as Error).message);
    },
    onSuccess: () => {
      toast.success('Membre banni');
    },
    onSettled: (_, __, { serverId }) => {
      queryClient.invalidateQueries({ queryKey: ['members', serverId] });
      queryClient.invalidateQueries({ queryKey: ['banned-members', serverId] });
    },
  });
}
