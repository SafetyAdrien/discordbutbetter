import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export function useSetSecondaryOwner() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ serverId, userId }: { serverId: string; userId: string }) => {
      const { error } = await supabase.rpc('set_secondary_owner', {
        _server_id: serverId,
        _user_id: userId
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Second propriétaire ajouté avec succès');
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
    onError: (error) => {
      toast.error("Impossible d'ajouter le second propriétaire");
      console.error(error);
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
    },
    onSuccess: () => {
      toast.success('Second propriétaire retiré');
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
    onError: (error) => {
      toast.error('Impossible de retirer le second propriétaire');
      console.error(error);
    }
  });
}
