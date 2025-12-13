import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface MemberWithProfile {
  id: string;
  nickname: string | null;
  joined_at: string | null;
  user: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    banner_url: string | null;
    status: 'online' | 'idle' | 'dnd' | 'offline' | null;
    custom_status: string | null;
  };
  roles: {
    id: string;
    name: string;
    color: string | null;
    icon_url: string | null;
    position: number | null;
  }[];
}

export function useMembers(serverId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['members', serverId],
    queryFn: async (): Promise<MemberWithProfile[]> => {
      if (!serverId) return [];

      const { data, error } = await supabase
        .from('server_members')
        .select(`
          id,
          nickname,
          joined_at,
          user:profiles!server_members_user_id_fkey (
            id,
            username,
            display_name,
            avatar_url,
            banner_url,
            status,
            custom_status
          ),
          member_roles (
            role:roles (
              id,
              name,
              color,
              icon_url,
              position
            )
          )
        `)
        .eq('server_id', serverId);

      if (error) throw error;

      // Transform data to flatten roles
      return data.map((member) => ({
        id: member.id,
        nickname: member.nickname,
        joined_at: member.joined_at,
        user: member.user as MemberWithProfile['user'],
        roles: member.member_roles
          .map((mr) => mr.role)
          .filter((r): r is MemberWithProfile['roles'][0] => r !== null)
          .sort((a, b) => (b.position ?? 0) - (a.position ?? 0)),
      }));
    },
    enabled: !!serverId && !!user,
  });

  // Real-time subscription for profile status updates
  useEffect(() => {
    if (!serverId || !user) return;

    const channel = supabase
      .channel(`presence:${serverId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
        },
        (payload) => {
          const updated = payload.new as any;
          queryClient.setQueryData<MemberWithProfile[]>(
            ['members', serverId],
            (old) => {
              if (!old) return old;
              return old.map((member) =>
                member.user.id === updated.id
                  ? {
                      ...member,
                      user: {
                        ...member.user,
                        status: updated.status,
                        custom_status: updated.custom_status,
                        display_name: updated.display_name,
                        avatar_url: updated.avatar_url,
                        banner_url: updated.banner_url,
                      },
                    }
                  : member
              );
            }
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [serverId, user, queryClient]);

  return query;
}
