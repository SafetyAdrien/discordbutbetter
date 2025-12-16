import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useLeaveServer() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (serverId: string) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('server_members')
        .delete()
        .eq('server_id', serverId)
        .eq('user_id', user.id);

      if (error) throw error;
      return serverId;
    },
    onSuccess: (serverId) => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      queryClient.invalidateQueries({ queryKey: ['members', serverId] });
      toast.success('Vous avez quitté le serveur');
    },
    onError: (error) => {
      toast.error('Erreur: ' + (error as Error).message);
    },
  });
}
