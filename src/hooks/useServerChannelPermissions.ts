import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCallback, useMemo } from 'react';

interface ServerChannelPermissions {
  viewable: Set<string>;
  connectable: Set<string>;
}

/**
 * Batch hook to check view_channel and connect_voice permissions
 * for ALL channels in a server with a SINGLE RPC call.
 * 
 * Replaces useChannelsVisibility + useVoiceChannelLocks with 1 request instead of N+M.
 * Real-time updates handled by usePermissionsRealtime cache invalidation.
 */
export function useServerChannelPermissions(serverId: string | null) {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['server-channel-permissions', serverId, user?.id],
    queryFn: async (): Promise<ServerChannelPermissions> => {
      if (!serverId || !user?.id) {
        return { viewable: new Set(), connectable: new Set() };
      }

      const { data, error } = await supabase.rpc('get_server_channel_permissions', {
        _user_id: user.id,
        _server_id: serverId,
      });

      if (error) {
        console.error('[useServerChannelPermissions] Error:', error);
        // Default to all visible/connectable on error to not lock users out
        return { viewable: new Set<string>(), connectable: new Set<string>() };
      }

      const viewable = new Set<string>();
      const connectable = new Set<string>();

      (data || []).forEach((row: { channel_id: string; can_view: boolean; can_connect: boolean }) => {
        if (row.can_view) viewable.add(row.channel_id);
        if (row.can_connect) connectable.add(row.channel_id);
      });

      return { viewable, connectable };
    },
    enabled: !!serverId && !!user?.id,
    staleTime: 0, // Always refetch on invalidation for instant permission updates
    gcTime: 300000, // Keep in garbage collection for 5 min
  });

  // Stable helper functions
  const isVisible = useCallback(
    (channelId: string) => {
      // During loading, default to visible to prevent flash
      if (query.isLoading) return true;
      return query.data?.viewable.has(channelId) ?? true;
    },
    [query.isLoading, query.data]
  );

  const isLocked = useCallback(
    (channelId: string) => {
      // During loading, default to unlocked
      if (query.isLoading) return false;
      // Locked = NOT connectable
      return !(query.data?.connectable.has(channelId) ?? true);
    },
    [query.isLoading, query.data]
  );

  // Memoized sets for direct access
  const viewableChannels = useMemo(
    () => query.data?.viewable ?? new Set<string>(),
    [query.data]
  );

  const connectableChannels = useMemo(
    () => query.data?.connectable ?? new Set<string>(),
    [query.data]
  );

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    // Helper functions
    isVisible,
    isLocked,
    // Direct set access
    viewableChannels,
    connectableChannels,
  };
}
