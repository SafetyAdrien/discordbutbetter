import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Returns the sorted list of years for which `userId` has been granted the
 * birthday badge. Empty array if none. Cache-first, realtime-refreshed.
 */
export function useBirthdayGrantYears(userId?: string | null) {
  const qc = useQueryClient();
  const instanceIdRef = useRef(Math.random().toString(36).slice(2));

  const query = useQuery({
    queryKey: ['birthday-grants', userId],
    enabled: !!userId,
    queryFn: async (): Promise<number[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('user_badge_grants' as never)
        .select('granted_for, badge:badges!inner(key)')
        .eq('user_id', userId)
        .eq('badges.key', 'birthday');
      if (error) return [];
      const rows = (data as unknown as Array<{ granted_for: number }>) ?? [];
      return rows.map((r) => r.granted_for).sort((a, b) => a - b);
    },
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    const channel = supabase
      .channel(`user-badge-grants-rt-${instanceIdRef.current}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_badge_grants' },
        () => qc.invalidateQueries({ queryKey: ['birthday-grants'] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  return query.data ?? [];
}
