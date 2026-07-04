import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/** Returns true if it's the target user's public birthday today. */
export function useIsBirthday(userId?: string | null) {
  const query = useQuery({
    queryKey: ['is-birthday', userId],
    enabled: !!userId,
    queryFn: async (): Promise<boolean> => {
      if (!userId) return false;
      const { data, error } = await supabase.rpc('is_birthday_today', { uid: userId });
      if (error) return false;
      return !!data;
    },
    staleTime: 1000 * 60 * 60, // 1h
    gcTime: 1000 * 60 * 60 * 6,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
  return !!query.data;
}

/** Batched: returns a Set of user IDs whose public birthday is today. */
export function useBirthdaysToday(userIds: (string | null | undefined)[]) {
  const ids = useMemo(
    () => Array.from(new Set(userIds.filter((x): x is string => !!x))).sort(),
    [userIds.join(',')],
  );
  const query = useQuery({
    queryKey: ['birthdays-today', ids],
    enabled: ids.length > 0,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase.rpc('are_birthdays_today', { uids: ids });
      if (error || !data) return [];
      return (data as Array<{ user_id: string }>).map((r) => r.user_id);
    },
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 6,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
  return useMemo(() => new Set(query.data ?? []), [query.data]);
}

/** Fires the private celebration flow for the current user (login toast, badge). */
export function useMyBirthdayStatus() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['my-birthday-status', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return { isBirthday: false };
      const { data: profile } = await supabase
        .from('profiles')
        .select('birthday')
        .eq('id', user.id)
        .maybeSingle();
      const b = (profile as { birthday?: string | null } | null)?.birthday;
      if (!b) return { isBirthday: false };
      const now = new Date();
      const d = new Date(b);
      const isBirthday = d.getUTCMonth() === now.getUTCMonth() && d.getUTCDate() === now.getUTCDate();
      return { isBirthday };
    },
    staleTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
  });
  return { ...query, invalidate: () => qc.invalidateQueries({ queryKey: ['my-birthday-status'] }) };
}

export async function claimMyBirthdayBadge() {
  const { data, error } = await supabase.rpc('claim_my_birthday_badge');
  if (error) throw error;
  return data as string | null;
}
