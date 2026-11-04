import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cacheGetSync, cacheSetAsync } from '@/lib/cache';

export interface MutualServer {
  id: string;
  name: string;
  icon_url: string | null;
  /** Pseudo de l'autre utilisateur dans ce serveur. */
  nickname?: string | null;
}

const mutualServersCacheKey = (me: string, other: string) =>
  `mutual-servers:${me}:${other}`;

export function useMutualServers(otherUserId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['mutual-servers', user?.id, otherUserId],
    queryFn: async (): Promise<MutualServer[]> => {
      if (!user || !otherUserId) return [];

      const { data: myServers, error: myError } = await supabase
        .from('server_members')
        .select('server_id')
        .eq('user_id', user.id);

      if (myError) throw myError;

      const myServerIds = myServers?.map((s) => s.server_id) || [];

      if (myServerIds.length === 0) {
        cacheSetAsync(mutualServersCacheKey(user.id, otherUserId), []);
        return [];
      }

      const { data: mutualServers, error: mutualError } = await supabase
        .from('server_members')
        .select(`
          nickname,
          server:servers (
            id,
            name,
            icon_url
          )
        `)
        .eq('user_id', otherUserId)
        .in('server_id', myServerIds);

      if (mutualError) throw mutualError;

      const result = (mutualServers?.map((s) => (s.server ? { ...s.server, nickname: s.nickname } : null)) || []).filter(
        Boolean,
      ) as MutualServer[];
      cacheSetAsync(mutualServersCacheKey(user.id, otherUserId), result);
      return result;
    },
    enabled: !!user && !!otherUserId,
    placeholderData: () =>
      user && otherUserId
        ? cacheGetSync<MutualServer[]>(mutualServersCacheKey(user.id, otherUserId))
        : undefined,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}
