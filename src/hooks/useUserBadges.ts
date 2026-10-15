import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cacheGetSync, cacheSetAsync } from '@/lib/cache';

export interface UserBadgeRow {
  badge_id: string;
  user_id: string;
  granted_at: string;
}

const userBadgesCacheKey = (uid: string) => `user-badges:${uid}`;

export function useUserBadges(userId?: string | null) {
  const queryClient = useQueryClient();
  // UserBadgeList and InlineBadgeStrip can both be mounted at once (profile
  // popup expanded into the full profile modal) — suffix the realtime
  // channel name per instance so they don't collide on the same topic.
  const instanceIdRef = useRef(Math.random().toString(36).slice(2));

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
      const result = data ?? [];
      cacheSetAsync(userBadgesCacheKey(userId), result);
      return result;
    },
    placeholderData: () =>
      userId ? cacheGetSync<UserBadgeRow[]>(userBadgesCacheKey(userId)) : undefined,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    const channel = supabase
      .channel(`user-badges-rt-${instanceIdRef.current}`)
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
