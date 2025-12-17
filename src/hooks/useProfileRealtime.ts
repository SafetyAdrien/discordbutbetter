import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { MemberWithProfile } from './useMembers';

/**
 * Hook to handle real-time profile status updates via broadcast
 * This complements the postgres_changes subscription with a more reliable broadcast mechanism
 */
export function useProfileRealtime(serverId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!serverId || !user) return;

    // Create a presence channel for this server
    const channel = supabase.channel(`presence:${serverId}`, {
      config: {
        broadcast: { self: false }, // Don't receive own broadcasts
      },
    });

    // Listen for status updates broadcast by other users
    channel.on('broadcast', { event: 'status_update' }, (payload) => {
      const { userId, status, custom_status, activity_type, activity_text } = payload.payload;

      // Update the members cache with the new status
      queryClient.setQueryData<MemberWithProfile[]>(
        ['members', serverId],
        (old) => {
          if (!old) return old;
          return old.map((member) =>
            member.user.id === userId
              ? {
                  ...member,
                  user: {
                    ...member.user,
                    status: status ?? member.user.status,
                    custom_status: custom_status !== undefined ? custom_status : member.user.custom_status,
                    activity_type: activity_type !== undefined ? activity_type : member.user.activity_type,
                    activity_text: activity_text !== undefined ? activity_text : member.user.activity_text,
                  },
                }
              : member
          );
        }
      );
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [serverId, user, queryClient]);
}

/**
 * Broadcast a status update to all users in the servers the current user is a member of
 */
export async function broadcastStatusUpdate(
  userId: string,
  status: string,
  custom_status?: string | null,
  activity_type?: string | null,
  activity_text?: string | null
) {
  // Get all servers the user is a member of
  const { data: memberships } = await supabase
    .from('server_members')
    .select('server_id')
    .eq('user_id', userId);

  if (!memberships) return;

  // Broadcast to each server's presence channel
  const broadcasts = memberships.map((membership) => {
    const channel = supabase.channel(`presence:${membership.server_id}`);
    return channel.send({
      type: 'broadcast',
      event: 'status_update',
      payload: {
        userId,
        status,
        custom_status,
        activity_type,
        activity_text,
      },
    });
  });

  await Promise.all(broadcasts);
}
