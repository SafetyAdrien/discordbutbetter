import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CategoryWithChannels, OrphanChannel, mutationLockRef } from './useChannels';

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ categoryId, serverId, name }: { categoryId: string; serverId: string; name: string }) => {
      const { error } = await supabase
        .from('categories')
        .update({ name })
        .eq('id', categoryId);

      if (error) throw error;
      return { categoryId, serverId, name };
    },
    onMutate: async ({ categoryId, serverId, name }) => {
      mutationLockRef.current = true;
      await queryClient.cancelQueries({ queryKey: ['servers'] });
      await queryClient.cancelQueries({ queryKey: ['channels', serverId] });
      
      const previousServers = queryClient.getQueryData(['servers']);
      const previousChannels = queryClient.getQueryData<{ categories: CategoryWithChannels[]; orphanChannels: OrphanChannel[] }>(['channels', serverId]);
      
      // Update servers cache
      queryClient.setQueryData(['servers'], (old: any) => {
        if (!old) return old;
        return old.map((server: any) => ({
          ...server,
          categories: server.categories?.map((cat: any) =>
            cat.id === categoryId ? { ...cat, name } : cat
          ),
        }));
      });
      
      // Update channels cache
      if (previousChannels) {
        queryClient.setQueryData(['channels', serverId], {
          ...previousChannels,
          categories: previousChannels.categories.map(cat =>
            cat.id === categoryId ? { ...cat, name } : cat
          )
        });
      }
      
      return { previousServers, previousChannels, serverId };
    },
    onError: (_err, { serverId }, context) => {
      if (context?.previousServers) {
        queryClient.setQueryData(['servers'], context.previousServers);
      }
      if (context?.previousChannels) {
        queryClient.setQueryData(['channels', serverId], context.previousChannels);
      }
      toast.error('Erreur lors de la mise à jour');
    },
    onSettled: (_, __, { serverId }) => {
      setTimeout(() => { mutationLockRef.current = false; }, 500);
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      queryClient.invalidateQueries({ queryKey: ['channels', serverId] });
    },
    onSuccess: () => {
      toast.success('Catégorie mise à jour');
    },
  });
}
