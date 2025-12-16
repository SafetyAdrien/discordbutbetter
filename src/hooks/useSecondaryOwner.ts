import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Server {
  id: string;
  name: string;
  icon_url: string | null;
  banner_url: string | null;
  description: string | null;
  owner_id: string | null;
  secondary_owner_id: string | null;
  is_public: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export function useSetSecondaryOwner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ serverId, userId }: { serverId: string; userId: string }) => {
      const { error } = await supabase.rpc('set_secondary_owner', {
        _server_id: serverId,
        _user_id: userId
      });
      if (error) throw error;
      return { serverId, userId };
    },
    onMutate: async ({ serverId, userId }) => {
      await queryClient.cancelQueries({ queryKey: ['servers'] });
      const previousServers = queryClient.getQueryData<Server[]>(['servers']);
      
      queryClient.setQueryData<Server[]>(['servers'], old =>
        old?.map(s => s.id === serverId ? { ...s, secondary_owner_id: userId } : s)
      );
      
      return { previousServers };
    },
    onError: (_, __, context) => {
      if (context?.previousServers) {
        queryClient.setQueryData(['servers'], context.previousServers);
      }
      toast.error("Impossible d'ajouter le second propriétaire");
    },
    onSuccess: () => {
      toast.success('Second propriétaire ajouté avec succès');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
    }
  });
}

export function useRemoveSecondaryOwner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (serverId: string) => {
      const { error } = await supabase.rpc('remove_secondary_owner', {
        _server_id: serverId
      });
      if (error) throw error;
      return serverId;
    },
    onMutate: async (serverId) => {
      await queryClient.cancelQueries({ queryKey: ['servers'] });
      const previousServers = queryClient.getQueryData<Server[]>(['servers']);
      
      queryClient.setQueryData<Server[]>(['servers'], old =>
        old?.map(s => s.id === serverId ? { ...s, secondary_owner_id: null } : s)
      );
      
      return { previousServers };
    },
    onError: (_, __, context) => {
      if (context?.previousServers) {
        queryClient.setQueryData(['servers'], context.previousServers);
      }
      toast.error('Impossible de retirer le second propriétaire');
    },
    onSuccess: () => {
      toast.success('Second propriétaire retiré');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
    }
  });
}

export function useTransferOwnership() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ serverId, newOwnerId }: { serverId: string; newOwnerId: string }) => {
      const { error } = await supabase.rpc('transfer_server_ownership', {
        _server_id: serverId,
        _new_owner_id: newOwnerId
      });
      if (error) throw error;
      return { serverId, newOwnerId };
    },
    onMutate: async ({ serverId, newOwnerId }) => {
      await queryClient.cancelQueries({ queryKey: ['servers'] });
      const previousServers = queryClient.getQueryData<Server[]>(['servers']);
      
      queryClient.setQueryData<Server[]>(['servers'], old =>
        old?.map(s => s.id === serverId ? { ...s, owner_id: newOwnerId, secondary_owner_id: null } : s)
      );
      
      return { previousServers };
    },
    onError: (_, __, context) => {
      if (context?.previousServers) {
        queryClient.setQueryData(['servers'], context.previousServers);
      }
      toast.error('Impossible de transférer la propriété');
    },
    onSuccess: () => {
      toast.success('Propriété transférée avec succès');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
    }
  });
}
