import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Badge {
  id: string;
  key: string;
  name: string;
  description: string;
  icon_url: string | null;
  color: string;
  sort_order: number;
}

export function useBadges() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['badges'],
    queryFn: async (): Promise<Badge[]> => {
      const { data, error } = await supabase
        .from('badges')
        .select('id, key, name, description, icon_url, color, sort_order')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    const channel = supabase
      .channel('badges-rt')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'badges' },
        () => queryClient.invalidateQueries({ queryKey: ['badges'] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

export function useIsAppAdmin() {
  return useQuery({
    queryKey: ['is-app-admin'],
    queryFn: async (): Promise<boolean> => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return false;
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userData.user.id)
        .eq('role', 'app_admin')
        .maybeSingle();
      if (error) return false;
      return !!data;
    },
    staleTime: 1000 * 60 * 10,
  });
}
