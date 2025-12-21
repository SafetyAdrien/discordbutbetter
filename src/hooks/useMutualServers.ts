import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface MutualServer {
  id: string;
  name: string;
  icon_url: string | null;
}

export function useMutualServers(otherUserId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['mutual-servers', user?.id, otherUserId],
    queryFn: async (): Promise<MutualServer[]> => {
      if (!user || !otherUserId) return [];

      // Get servers where the current user is a member
      const { data: myServers, error: myError } = await supabase
        .from('server_members')
        .select('server_id')
        .eq('user_id', user.id);

      if (myError) throw myError;

      const myServerIds = myServers?.map(s => s.server_id) || [];

      if (myServerIds.length === 0) return [];

      // Get servers where the other user is also a member
      const { data: mutualServers, error: mutualError } = await supabase
        .from('server_members')
        .select(`
          server:servers (
            id,
            name,
            icon_url
          )
        `)
        .eq('user_id', otherUserId)
        .in('server_id', myServerIds);

      if (mutualError) throw mutualError;

      return (mutualServers?.map(s => s.server) || []).filter(Boolean) as MutualServer[];
    },
    enabled: !!user && !!otherUserId,
  });
}
