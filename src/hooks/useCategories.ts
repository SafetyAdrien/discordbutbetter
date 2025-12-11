import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ categoryId, name }: { categoryId: string; name: string }) => {
      const { error } = await supabase
        .from('categories')
        .update({ name })
        .eq('id', categoryId);

      if (error) throw error;
      return { categoryId, name };
    },
    onMutate: async ({ categoryId, name }) => {
      await queryClient.cancelQueries({ queryKey: ['servers'] });
      
      const previousServers = queryClient.getQueryData(['servers']);
      
      queryClient.setQueryData(['servers'], (old: any) => {
        if (!old) return old;
        return old.map((server: any) => ({
          ...server,
          categories: server.categories?.map((cat: any) =>
            cat.id === categoryId ? { ...cat, name } : cat
          ),
        }));
      });
      
      return { previousServers };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousServers) {
        queryClient.setQueryData(['servers'], context.previousServers);
      }
      toast.error('Erreur lors de la mise à jour');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
    },
    onSuccess: () => {
      toast.success('Catégorie mise à jour');
    },
  });
}
