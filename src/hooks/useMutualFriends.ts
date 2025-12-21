import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface MutualFriend {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  status: string | null;
}

export function useMutualFriends(otherUserId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['mutual-friends', user?.id, otherUserId],
    queryFn: async (): Promise<MutualFriend[]> => {
      if (!user || !otherUserId) return [];

      // Get current user's friends
      const { data: myFriendships, error: myError } = await supabase
        .from('friendships')
        .select('user_id, friend_id')
        .eq('status', 'accepted')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

      if (myError) throw myError;

      const myFriendIds = myFriendships?.map(f => 
        f.user_id === user.id ? f.friend_id : f.user_id
      ) || [];

      if (myFriendIds.length === 0) return [];

      // Get other user's friends
      const { data: theirFriendships, error: theirError } = await supabase
        .from('friendships')
        .select('user_id, friend_id')
        .eq('status', 'accepted')
        .or(`user_id.eq.${otherUserId},friend_id.eq.${otherUserId}`);

      if (theirError) throw theirError;

      const theirFriendIds = theirFriendships?.map(f => 
        f.user_id === otherUserId ? f.friend_id : f.user_id
      ) || [];

      // Find intersection
      const mutualFriendIds = myFriendIds.filter(id => theirFriendIds.includes(id));

      if (mutualFriendIds.length === 0) return [];

      // Fetch profiles for mutual friends
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, status')
        .in('id', mutualFriendIds);

      if (profilesError) throw profilesError;

      return (profiles || []) as MutualFriend[];
    },
    enabled: !!user && !!otherUserId,
  });
}
