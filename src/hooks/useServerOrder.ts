import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

/**
 * Hook for managing user-specific server ordering.
 * Source of truth = `profiles.server_order` (UUID[]), already loaded by AuthContext.
 * We expose it as a React Query cache so mutations can do optimistic patching,
 * and we sync it to any external change picked up by AuthContext's realtime sub.
 */
export function useServerOrder() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const profileOrder = (profile?.server_order || []) as string[];

  const { data: serverOrder = [], isLoading } = useQuery({
    queryKey: ['server-order', user?.id],
    // Mirror AuthContext profile — no extra network round-trip.
    queryFn: async () => profileOrder,
    enabled: !!user?.id,
    initialData: profileOrder,
    staleTime: Infinity,
  });

  // Sync cache when AuthContext profile updates (cross-device, external edit, etc.)
  useEffect(() => {
    if (!user?.id) return;
    const cached = queryClient.getQueryData<string[]>(['server-order', user.id]) || [];
    const next = profileOrder;
    if (cached.length !== next.length || cached.some((id, i) => id !== next[i])) {
      queryClient.setQueryData(['server-order', user.id], next);
    }
  }, [profileOrder, user?.id, queryClient]);

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
      await queryClient.cancelQueries({ queryKey: ['server-order', user?.id] });
      const previousOrder = queryClient.getQueryData<string[]>(['server-order', user?.id]);
      queryClient.setQueryData(['server-order', user?.id], newOrder);
      return { previousOrder };
    },
    onError: (_err, _newOrder, context) => {
      if (context?.previousOrder) {
        queryClient.setQueryData(['server-order', user?.id], context.previousOrder);
      }
      toast.error('Erreur lors de la sauvegarde', { description: "L'ordre des serveurs n'a pas pu être sauvegardé" });
    },
  });

  const sortServers = <T extends { id: string }>(servers: T[]): T[] => {
    if (!serverOrder.length) return servers;
    const orderMap = new Map(serverOrder.map((id, index) => [id, index]));
    return [...servers].sort((a, b) => {
      const indexA = orderMap.get(a.id) ?? Infinity;
      const indexB = orderMap.get(b.id) ?? Infinity;
      return indexA - indexB;
    });
  };

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
