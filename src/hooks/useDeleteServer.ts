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

export function useDeleteServer() {
  const queryClient = useQueryClient();

  const deleteAsOwner = useMutation({
    mutationFn: async (serverId: string) => {
      const { error } = await supabase.rpc('delete_server_as_owner', {
        _server_id: serverId
      });
      if (error) throw error;
      return serverId;
    },
    onMutate: async (serverId) => {
      await queryClient.cancelQueries({ queryKey: ['servers'] });
      const previousServers = queryClient.getQueryData<Server[]>(['servers']);
      
      queryClient.setQueryData<Server[]>(['servers'], old =>
        old?.filter(s => s.id !== serverId)
      );
      
      return { previousServers };
    },
    onError: (error, _, context) => {
      if (context?.previousServers) {
        queryClient.setQueryData(['servers'], context.previousServers);
      }
      toast.error('Impossible de supprimer le serveur');
      console.error('Delete server error:', error);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
    }
  });

  const requestDeletion = useMutation({
    mutationFn: async (serverId: string) => {
      const { error } = await supabase.rpc('request_server_deletion', {
        _server_id: serverId
      });
      if (error) throw error;
      return serverId;
    },
    onError: (error) => {
      toast.error('Impossible d\'envoyer la demande de suppression');
      console.error('Request deletion error:', error);
    }
  });

  return {
    deleteAsOwner,
    requestDeletion,
    isDeleting: deleteAsOwner.isPending || requestDeletion.isPending
  };
}
