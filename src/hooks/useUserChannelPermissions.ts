import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

type ServerPermission = Database['public']['Enums']['server_permission'];

export interface UserChannelPermissions {
  canReadMessages: boolean;
  canSendMessages: boolean;
  canManageMessages: boolean;
  canConnectVoice: boolean;
  canSpeakVoice: boolean;
  canMentionEveryone: boolean;
  canManageChannels: boolean;
  canManageRoles: boolean;
  isAdmin: boolean;
}

// Hook pour vérifier une permission spécifique sur un salon
export function useHasChannelPermission(channelId: string | null, permission: ServerPermission) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['channel-permission', channelId, permission, user?.id],
    queryFn: async (): Promise<boolean> => {
      if (!channelId || !user?.id) return false;

      console.log(`[useHasChannelPermission] 🔍 Checking ${permission} for channel ${channelId}`);

      const { data, error } = await supabase.rpc('has_channel_permission', {
        _user_id: user.id,
        _channel_id: channelId,
        _permission: permission,
      });

      if (error) {
        console.error('Error checking channel permission:', error);
        return false;
      }

      console.log(`[useHasChannelPermission] ✅ ${permission} = ${data} for channel ${channelId}`);
      return data ?? false;
    },
    enabled: !!channelId && !!user?.id,
    staleTime: 0,
    gcTime: 300000, // Keep in cache 5 min to allow refetch
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
}

// Hook pour récupérer toutes les permissions d'un utilisateur sur un salon
export function useUserChannelPermissions(channelId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-channel-permissions', channelId, user?.id],
    queryFn: async (): Promise<UserChannelPermissions> => {
      if (!channelId || !user?.id) {
        return {
          canReadMessages: false,
          canSendMessages: false,
          canManageMessages: false,
          canConnectVoice: false,
          canSpeakVoice: false,
          canMentionEveryone: false,
          canManageChannels: false,
          canManageRoles: false,
          isAdmin: false,
        };
      }

      const { data, error } = await supabase.rpc('get_user_channel_permissions', {
        _user_id: user.id,
        _channel_id: channelId,
      });

      if (error) {
        console.error('Error fetching user channel permissions:', error);
        return {
          canReadMessages: false,
          canSendMessages: false,
          canManageMessages: false,
          canConnectVoice: false,
          canSpeakVoice: false,
          canMentionEveryone: false,
          canManageChannels: false,
          canManageRoles: false,
          isAdmin: false,
        };
      }

      // Convertir le résultat en objet de permissions
      const permMap = new Map<ServerPermission, boolean>();
      (data || []).forEach((row: { permission: ServerPermission; granted: boolean }) => {
        permMap.set(row.permission, row.granted);
      });

      return {
        canReadMessages: permMap.get('read_messages') ?? false,
        canSendMessages: permMap.get('send_messages') ?? false,
        canManageMessages: permMap.get('manage_messages') ?? false,
        canConnectVoice: permMap.get('connect_voice') ?? false,
        canSpeakVoice: permMap.get('speak_voice') ?? false,
        canMentionEveryone: permMap.get('mention_everyone') ?? false,
        canManageChannels: permMap.get('manage_channels') ?? false,
        canManageRoles: permMap.get('manage_roles') ?? false,
        isAdmin: permMap.get('administrator') ?? false,
      };
    },
    enabled: !!channelId && !!user?.id,
    staleTime: 0, // Always refetch on invalidation for realtime updates
  });
}
