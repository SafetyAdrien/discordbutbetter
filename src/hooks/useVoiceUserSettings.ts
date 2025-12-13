import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { mediaManager } from '@/utils/webrtc/MediaManager';
import { toast } from 'sonner';

interface VolumeSettings {
  [targetUserId: string]: number;
}

export function useVoiceUserSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch user's volume settings for all targets
  const { data: volumeSettings = {} } = useQuery<VolumeSettings>({
    queryKey: ['voice-user-settings', user?.id],
    queryFn: async () => {
      if (!user) return {};

      const { data, error } = await supabase
        .from('voice_user_settings')
        .select('target_user_id, volume')
        .eq('user_id', user.id);

      if (error) throw error;

      const settings: VolumeSettings = {};
      data?.forEach(s => {
        settings[s.target_user_id] = s.volume;
      });
      return settings;
    },
    enabled: !!user,
  });

  // Set volume for a specific user
  const setUserVolume = useMutation({
    mutationFn: async ({ targetUserId, volume }: { targetUserId: string; volume: number }) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('voice_user_settings')
        .upsert({
          user_id: user.id,
          target_user_id: targetUserId,
          volume,
        }, {
          onConflict: 'user_id,target_user_id',
        });

      if (error) throw error;

      // Apply volume immediately to audio
      mediaManager.setRemoteAudioVolume(targetUserId, volume);
    },
    onMutate: async ({ targetUserId, volume }) => {
      // Optimistic update
      const previousSettings = queryClient.getQueryData<VolumeSettings>(['voice-user-settings', user?.id]);
      queryClient.setQueryData(['voice-user-settings', user?.id], {
        ...previousSettings,
        [targetUserId]: volume,
      });
      return { previousSettings };
    },
    onError: (_, __, context) => {
      // Rollback on error
      if (context?.previousSettings) {
        queryClient.setQueryData(['voice-user-settings', user?.id], context.previousSettings);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['voice-user-settings'] });
    },
  });

  // Server mute a participant (admin only)
  const serverMuteUser = useMutation({
    mutationFn: async ({ 
      channelId, 
      targetUserId, 
      muted 
    }: { 
      channelId: string; 
      targetUserId: string; 
      muted: boolean;
    }) => {
      const { error } = await supabase.rpc('server_mute_participant', {
        _channel_id: channelId,
        _target_user_id: targetUserId,
        _muted: muted,
      });
      if (error) throw error;
    },
    onSuccess: (_, { muted }) => {
      toast.success(muted ? 'Utilisateur muté par le serveur' : 'Mute serveur retiré');
      queryClient.invalidateQueries({ queryKey: ['voice-participants'] });
    },
    onError: () => {
      toast.error('Impossible de muter cet utilisateur');
    },
  });

  // Server deafen a participant (admin only)
  const serverDeafenUser = useMutation({
    mutationFn: async ({ 
      channelId, 
      targetUserId, 
      deafened 
    }: { 
      channelId: string; 
      targetUserId: string; 
      deafened: boolean;
    }) => {
      const { error } = await supabase.rpc('server_deafen_participant', {
        _channel_id: channelId,
        _target_user_id: targetUserId,
        _deafened: deafened,
      });
      if (error) throw error;
    },
    onSuccess: (_, { deafened }) => {
      toast.success(deafened ? 'Utilisateur rendu sourd par le serveur' : 'Sourdine serveur retirée');
      queryClient.invalidateQueries({ queryKey: ['voice-participants'] });
    },
    onError: () => {
      toast.error('Impossible de rendre sourd cet utilisateur');
    },
  });

  // Get volume for a specific user (default 100)
  const getUserVolume = (targetUserId: string): number => {
    return volumeSettings[targetUserId] ?? 100;
  };

  return {
    volumeSettings,
    getUserVolume,
    setUserVolume,
    serverMuteUser,
    serverDeafenUser,
  };
}
