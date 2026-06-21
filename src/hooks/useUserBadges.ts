import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UserBadgeRow {
  badge_id: string;
  user_id: string;
  granted_at: string;
}

export function useUserBadges(userId?: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['user-badges', userId],
    enabled: !!userId,
    queryFn: async (): Promise<UserBadgeRow[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('user_badges')
        .select('badge_id, user_id, granted_at')
        .eq('user_id', userId);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 1000 * 60 * 2,
  });

  useEffect(() => {
    const channel = supabase
      .channel('user-badges-rt')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_badges' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['user-badges'] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}
