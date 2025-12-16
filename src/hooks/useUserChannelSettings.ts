import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useEffect } from 'react';

export type NotificationSetting = 'default' | 'all' | 'mentions' | 'nothing';

export type MuteDuration = '15m' | '1h' | '3h' | '8h' | '24h' | 'forever';

export interface UserChannelSetting {
  id: string;
  user_id: string;
  channel_id: string | null;
  category_id: string | null;
  muted: boolean;
  mute_until: string | null;
  notification_setting: NotificationSetting;
}

// Helper to calculate mute_until date
function getMuteUntilDate(duration: MuteDuration): string | null {
  if (duration === 'forever') return null;
  
  const now = new Date();
  const minutes: Record<MuteDuration, number> = {
    '15m': 15,
    '1h': 60,
    '3h': 180,
    '8h': 480,
    '24h': 1440,
    'forever': 0,
  };
  
  now.setMinutes(now.getMinutes() + minutes[duration]);
  return now.toISOString();
}

export function useUserChannelSettings(serverId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['user-channel-settings', serverId, user?.id],
    queryFn: async (): Promise<UserChannelSetting[]> => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('user_channel_settings')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      return (data || []).map(d => ({
        ...d,
        notification_setting: (d.notification_setting as NotificationSetting) || 'default',
      }));
    },
    enabled: !!user && !!serverId,
  });

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('user-channel-settings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_channel_settings',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['user-channel-settings'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return query;
}

export function useMuteChannel() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ channelId, duration }: { channelId: string; duration: MuteDuration | null }) => {
      if (!user) throw new Error('Not authenticated');

      const muted = duration !== null;
      const muteUntil = duration ? getMuteUntilDate(duration) : null;

      // Check if setting exists
      const { data: existing } = await supabase
        .from('user_channel_settings')
        .select('id')
        .eq('user_id', user.id)
        .eq('channel_id', channelId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('user_channel_settings')
          .update({ muted, mute_until: muteUntil })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_channel_settings')
          .insert({ user_id: user.id, channel_id: channelId, muted, mute_until: muteUntil });
        if (error) throw error;
      }
    },
    onMutate: async ({ channelId, duration }) => {
      await queryClient.cancelQueries({ queryKey: ['user-channel-settings'] });
      const previous = queryClient.getQueryData(['user-channel-settings']);
      return { previous };
    },
    onSuccess: (_, { duration }) => {
      toast.success(duration ? 'Canal rendu muet' : 'Notifications réactivées');
    },
    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['user-channel-settings'], context.previous);
      }
      toast.error('Erreur lors de la modification');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['user-channel-settings'] });
    },
  });
}

export function useMuteCategory() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ categoryId, duration }: { categoryId: string; duration: MuteDuration | null }) => {
      if (!user) throw new Error('Not authenticated');

      const muted = duration !== null;
      const muteUntil = duration ? getMuteUntilDate(duration) : null;

      // Check if setting exists
      const { data: existing } = await supabase
        .from('user_channel_settings')
        .select('id')
        .eq('user_id', user.id)
        .eq('category_id', categoryId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('user_channel_settings')
          .update({ muted, mute_until: muteUntil })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_channel_settings')
          .insert({ user_id: user.id, category_id: categoryId, muted, mute_until: muteUntil });
        if (error) throw error;
      }
    },
    onMutate: async ({ categoryId, duration }) => {
      await queryClient.cancelQueries({ queryKey: ['user-channel-settings'] });
      const previous = queryClient.getQueryData(['user-channel-settings']);
      return { previous };
    },
    onSuccess: (_, { duration }) => {
      toast.success(duration ? 'Catégorie rendue muette' : 'Notifications réactivées');
    },
    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['user-channel-settings'], context.previous);
      }
      toast.error('Erreur lors de la modification');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['user-channel-settings'] });
    },
  });
}

export function useSetChannelNotification() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ channelId, setting }: { channelId: string; setting: NotificationSetting }) => {
      if (!user) throw new Error('Not authenticated');

      // Check if setting exists
      const { data: existing } = await supabase
        .from('user_channel_settings')
        .select('id')
        .eq('user_id', user.id)
        .eq('channel_id', channelId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('user_channel_settings')
          .update({ notification_setting: setting })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_channel_settings')
          .insert({ 
            user_id: user.id, 
            channel_id: channelId, 
            notification_setting: setting,
            muted: false 
          });
        if (error) throw error;
      }
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['user-channel-settings'] });
      const previous = queryClient.getQueryData(['user-channel-settings']);
      return { previous };
    },
    onSuccess: () => {
      toast.success('Paramètres de notification mis à jour');
    },
    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['user-channel-settings'], context.previous);
      }
      toast.error('Erreur lors de la modification');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['user-channel-settings'] });
    },
  });
}

export function useSetCategoryNotification() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ categoryId, setting }: { categoryId: string; setting: NotificationSetting }) => {
      if (!user) throw new Error('Not authenticated');

      // Check if setting exists
      const { data: existing } = await supabase
        .from('user_channel_settings')
        .select('id')
        .eq('user_id', user.id)
        .eq('category_id', categoryId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('user_channel_settings')
          .update({ notification_setting: setting })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_channel_settings')
          .insert({ 
            user_id: user.id, 
            category_id: categoryId, 
            notification_setting: setting,
            muted: false 
          });
        if (error) throw error;
      }
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['user-channel-settings'] });
      const previous = queryClient.getQueryData(['user-channel-settings']);
      return { previous };
    },
    onSuccess: () => {
      toast.success('Paramètres de notification mis à jour');
    },
    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['user-channel-settings'], context.previous);
      }
      toast.error('Erreur lors de la modification');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['user-channel-settings'] });
    },
  });
}

// Helper hook to check if a channel is muted
export function useIsChannelMuted(channelId: string | null, serverId: string | null) {
  const { data: settings = [] } = useUserChannelSettings(serverId);
  
  if (!channelId) return false;
  
  const setting = settings.find(s => s.channel_id === channelId);
  if (!setting?.muted) return false;
  
  // Check if mute has expired
  if (setting.mute_until) {
    const muteUntil = new Date(setting.mute_until);
    if (muteUntil < new Date()) return false;
  }
  
  return true;
}

// Helper hook to check if a category is muted
export function useIsCategoryMuted(categoryId: string | null, serverId: string | null) {
  const { data: settings = [] } = useUserChannelSettings(serverId);
  
  if (!categoryId) return false;
  
  const setting = settings.find(s => s.category_id === categoryId);
  if (!setting?.muted) return false;
  
  // Check if mute has expired
  if (setting.mute_until) {
    const muteUntil = new Date(setting.mute_until);
    if (muteUntil < new Date()) return false;
  }
  
  return true;
}

// Helper hook to get notification setting for a channel
export function useChannelNotificationSetting(channelId: string | null, serverId: string | null): NotificationSetting {
  const { data: settings = [] } = useUserChannelSettings(serverId);
  
  if (!channelId) return 'default';
  
  const setting = settings.find(s => s.channel_id === channelId);
  return setting?.notification_setting || 'default';
}

// Helper hook to get notification setting for a category
export function useCategoryNotificationSetting(categoryId: string | null, serverId: string | null): NotificationSetting {
  const { data: settings = [] } = useUserChannelSettings(serverId);
  
  if (!categoryId) return 'default';
  
  const setting = settings.find(s => s.category_id === categoryId);
  return setting?.notification_setting || 'default';
}
