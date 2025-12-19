import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Mutation lock to prevent Realtime invalidations during local role mutations
export const membersMutationLockRef = { current: false };

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
  });

  // Real-time subscription for member changes (join/leave/kick/ban) and role changes
  useEffect(() => {
    if (!serverId || !user) return;

    const channel = supabase
      .channel(`members-realtime:${serverId}`)
      // Listen for member deletions (kick/leave) - NO filter, use client-side filtering
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'server_members',
        },
        (payload) => {
          const deleted = payload.old as any;
          // Client-side filtering for reliability
          if (deleted.server_id !== serverId) return;
          
          queryClient.setQueryData<MemberWithProfile[]>(
            ['members', serverId],
            (old) => old?.filter((member) => member.id !== deleted.id) || []
          );
        }
      )
      // Listen for new members - NO filter, use client-side filtering
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'server_members',
        },
        (payload) => {
          const inserted = payload.new as any;
          // Client-side filtering for reliability
          if (inserted.server_id !== serverId) return;
          
          // Refetch to get full member data with profile
          queryClient.invalidateQueries({ queryKey: ['members', serverId] });
        }
      )
      // Listen for role assignments (INSERT on member_roles)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'member_roles',
        },
        async (payload) => {
          // Skip if a local mutation is in progress to avoid flickering
          if (membersMutationLockRef.current) return;

          const inserted = payload.new as { member_id: string; role_id: string };
          
          // Fetch role details for the newly assigned role
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
        }
      )
      // Listen for role removals (DELETE on member_roles)
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'member_roles',
        },
        (payload) => {
          // Skip if a local mutation is in progress to avoid flickering
          if (membersMutationLockRef.current) return;

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
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[useMembers] Real-time subscription active for server ${serverId}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`[useMembers] Real-time subscription error for server ${serverId}`);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [serverId, user, queryClient]);

  return query;
}
