import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

/**
 * Hook for managing user-specific server ordering
 * Stores order in profiles.server_order as UUID array
 */
export function useServerOrder() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: serverOrder = [], isLoading } = useQuery({
    queryKey: ['server-order', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('profiles')
        .select('server_order')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      return (data?.server_order || []) as string[];
    },
    enabled: !!user?.id,
  });

  const updateOrderMutation = useMutation({
    mutationFn: async (newOrder: string[]) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('profiles')
        .update({ server_order: newOrder })
        .eq('id', user.id);
      
      if (error) throw error;
      return newOrder;
    },
    onMutate: async (newOrder) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['server-order', user?.id] });
      
      // Snapshot previous value
      const previousOrder = queryClient.getQueryData<string[]>(['server-order', user?.id]);
      
      // Optimistically update
      queryClient.setQueryData(['server-order', user?.id], newOrder);
      
      return { previousOrder };
    },
    onError: (err, _newOrder, context) => {
      // Rollback on error
      if (context?.previousOrder) {
        queryClient.setQueryData(['server-order', user?.id], context.previousOrder);
      }
      toast({
        title: 'Erreur lors de la sauvegarde',
        description: 'L\'ordre des serveurs n\'a pas pu être sauvegardé',
        variant: 'destructive',
      });
    },
  });

  /**
   * Sort servers according to user's custom order
   * Servers not in the order array are appended at the end
   */
  const sortServers = <T extends { id: string }>(servers: T[]): T[] => {
    if (!serverOrder.length) return servers;
    
    const orderMap = new Map(serverOrder.map((id, index) => [id, index]));
    
    return [...servers].sort((a, b) => {
      const indexA = orderMap.get(a.id) ?? Infinity;
      const indexB = orderMap.get(b.id) ?? Infinity;
      return indexA - indexB;
    });
  };

  /**
   * Update server order after drag and drop
   */
  const reorderServers = (serverIds: string[]) => {
    updateOrderMutation.mutate(serverIds);
  };

  return {
    serverOrder,
    isLoading,
    sortServers,
    reorderServers,
    isReordering: updateOrderMutation.isPending,
  };
}
