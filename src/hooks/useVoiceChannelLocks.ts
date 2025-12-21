import { useQueries } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMemo, useCallback } from "react";

/**
 * Hook to check which voice channels are locked (connect_voice permission denied)
 * Uses query keys compatible with usePermissionsRealtime for instant updates
 */
export function useVoiceChannelLocks(voiceChannelIds: string[]) {
  const { user } = useAuth();

  const queries = useQueries({
    queries: voiceChannelIds.map((channelId) => ({
      // Query key compatible with usePermissionsRealtime for real-time invalidation
      queryKey: ['channel-permission', channelId, 'connect_voice', user?.id],
      queryFn: async () => {
        if (!user?.id) return { channelId, hasPermission: true };
        
        const { data, error } = await supabase.rpc('has_channel_permission', {
          _channel_id: channelId,
          _permission: 'connect_voice',
          _user_id: user.id
        });

        if (error) {
          console.error('Error checking connect_voice permission:', error);
          return { channelId, hasPermission: true }; // Default to unlocked on error
        }

        return { channelId, hasPermission: data as boolean };
      },
      enabled: !!user?.id && voiceChannelIds.length > 0,
      staleTime: 0, // Instant updates for permission changes
    })),
  });

  // Build a Set of locked channel IDs
  const lockedChannels = useMemo(() => {
    const locked = new Set<string>();
    queries.forEach((query) => {
      if (query.data && !query.data.hasPermission) {
        locked.add(query.data.channelId);
      }
    });
    return locked;
  }, [queries]);

  const isLoading = queries.some((q) => q.isLoading);

  // Helper function to check if a specific channel is locked
  const isLocked = useCallback(
    (channelId: string) => lockedChannels.has(channelId),
    [lockedChannels]
  );

  return {
    lockedChannels,
    isLoading,
    isLocked,
  };
}
