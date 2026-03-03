/* @refresh reset */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Mutation lock to prevent Realtime invalidations during local role mutations
export const membersMutationLockRef = { current: false };

export interface ServerProfileData {
  id: string;
  user_id: string;
  server_id: string;
  display_name: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  pronouns: string | null;
}

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
    activity_type: string | null;
    activity_text: string | null;
    pronouns: string | null;
  };
  roles: {
    id: string;
    name: string;
    color: string | null;
    icon_url: string | null;
    position: number | null;
    description: string | null;
  }[];
  serverProfile: ServerProfileData | null;
}

export function useMembers(serverId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [hasRealtimeError, setHasRealtimeError] = useState(false);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
            custom_status,
            activity_type,
            activity_text,
            pronouns
          ),
          member_roles (
            role:roles (
              id,
              name,
              color,
              icon_url,
              position,
              description
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
    // Polling fallback if realtime fails
    refetchInterval: hasRealtimeError ? 30000 : false,
  });

  const membersChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const rolesChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Real-time subscription for server_members changes (join/leave/kick/ban)
  useEffect(() => {
    if (!serverId || !user) return;

    // Clean up existing subscription
    if (membersChannelRef.current) {
      supabase.removeChannel(membersChannelRef.current);
      membersChannelRef.current = null;
    }

    const channelName = `server-members:${serverId}`;

    membersChannelRef.current = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'server_members',
        },
        (payload) => {
          const record = (payload.new || payload.old) as { id: string; server_id: string } | null;
          if (!record || record.server_id !== serverId) return;
          
          if (payload.eventType === 'DELETE') {
            queryClient.setQueryData<MemberWithProfile[]>(
              ['members', serverId],
              (old) => old?.filter((member) => member.id !== record.id) || []
            );
          } else if (payload.eventType === 'INSERT') {
            queryClient.refetchQueries({ queryKey: ['members', serverId] });
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          setHasRealtimeError(false);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setHasRealtimeError(true);
        }
      });

    return () => {
      if (membersChannelRef.current) {
        supabase.removeChannel(membersChannelRef.current);
        membersChannelRef.current = null;
      }
    };
  }, [serverId, user, queryClient]);

  // Debounced refetch to guarantee server truth after local patch
  const debouncedRefetchRef = useRef<ReturnType<typeof setTimeout>>();
  const pendingPostLockRef = useRef(false);

  const scheduleGuaranteedRefetch = useCallback(() => {
    // If mutation lock is active, schedule refetch for after lock releases
    if (membersMutationLockRef.current) {
      pendingPostLockRef.current = true;
      return;
    }
    clearTimeout(debouncedRefetchRef.current);
    debouncedRefetchRef.current = setTimeout(() => {
      queryClient.refetchQueries({ queryKey: ['members', serverId] });
    }, 300);
  }, [queryClient, serverId]);

  // Check for pending post-lock refetch
  useEffect(() => {
    const interval = setInterval(() => {
      if (pendingPostLockRef.current && !membersMutationLockRef.current) {
        pendingPostLockRef.current = false;
        queryClient.refetchQueries({ queryKey: ['members', serverId] });
      }
    }, 200);
    return () => clearInterval(interval);
  }, [queryClient, serverId]);

  // Separate real-time subscription for member_roles changes
  useEffect(() => {
    if (!serverId || !user) return;

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    if (rolesChannelRef.current) {
      supabase.removeChannel(rolesChannelRef.current);
      rolesChannelRef.current = null;
    }

    const channelName = `member-roles-for-members:${serverId}`;

    rolesChannelRef.current = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'member_roles',
        },
        async (payload) => {
          // Always schedule a guaranteed refetch (even during lock — it'll run post-lock)
          scheduleGuaranteedRefetch();

          // Skip optimistic patch if lock is active (local mutation already handled it)
          if (membersMutationLockRef.current) return;

          if (payload.eventType === 'INSERT') {
            const inserted = payload.new as { member_id: string; role_id: string };
            
            const { data: roleData } = await supabase
              .from('roles')
              .select('id, name, color, icon_url, position, description')
              .eq('id', inserted.role_id)
              .single();

            if (roleData) {
              queryClient.setQueryData<MemberWithProfile[]>(
                ['members', serverId],
                (old) =>
                  old?.map((m) => {
                    if (m.id !== inserted.member_id) return m;
                    const alreadyHas = m.roles.some((r) => r.id === roleData.id);
                    if (alreadyHas) return m;
                    return {
                      ...m,
                      roles: [...m.roles, roleData].sort(
                        (a, b) => (b.position ?? 0) - (a.position ?? 0)
                      ),
                    };
                  }) || []
              );
            }
          } else if (payload.eventType === 'DELETE') {
            const deleted = payload.old as { member_id: string; role_id: string };

            queryClient.setQueryData<MemberWithProfile[]>(
              ['members', serverId],
              (old) =>
                old?.map((m) => {
                  if (m.id !== deleted.member_id) return m;
                  return {
                    ...m,
                    roles: m.roles.filter((r) => r.id !== deleted.role_id),
                  };
                }) || []
            );
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setHasRealtimeError(true);
          retryTimeoutRef.current = setTimeout(() => {
            queryClient.refetchQueries({ queryKey: ['members', serverId] });
          }, 2000);
        }
      });

    return () => {
      clearTimeout(debouncedRefetchRef.current);
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (rolesChannelRef.current) {
        supabase.removeChannel(rolesChannelRef.current);
        rolesChannelRef.current = null;
      }
    };
  }, [serverId, user, queryClient, scheduleGuaranteedRefetch]);

  return query;
}
