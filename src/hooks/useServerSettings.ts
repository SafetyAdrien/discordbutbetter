import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ServerSettings {
  id: string;
  server_id: string;
  welcome_message: string | null;
  welcome_channel_id: string | null;
  auto_assign_roles: string[];
  system_messages_enabled: boolean;
}

export function useServerSettings(serverId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['server-settings', serverId],
    queryFn: async (): Promise<ServerSettings | null> => {
      const { data, error } = await supabase
        .from('server_settings')
        .select('*')
        .eq('server_id', serverId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!serverId && !!user,
  });
}

export function useUpdateServerSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      serverId,
      settings,
    }: {
      serverId: string;
      settings: Partial<Omit<ServerSettings, 'id' | 'server_id'>>;
    }) => {
      // Try to update first
      const { data: existing } = await supabase
        .from('server_settings')
        .select('id')
        .eq('server_id', serverId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('server_settings')
          .update({ ...settings, updated_at: new Date().toISOString() })
          .eq('server_id', serverId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('server_settings')
          .insert({ server_id: serverId, ...settings });
        if (error) throw error;
      }

      return { serverId };
    },
    onMutate: async ({ serverId, settings }) => {
      await queryClient.cancelQueries({ queryKey: ['server-settings', serverId] });
      const previousSettings = queryClient.getQueryData(['server-settings', serverId]);
      
      queryClient.setQueryData(['server-settings', serverId], (old: ServerSettings | null | undefined) => {
        if (!old) {
          return {
            id: `temp-${Date.now()}`,
            server_id: serverId,
            welcome_message: settings.welcome_message ?? null,
            welcome_channel_id: settings.welcome_channel_id ?? null,
            auto_assign_roles: settings.auto_assign_roles ?? [],
            system_messages_enabled: settings.system_messages_enabled ?? true,
          };
        }
        return { ...old, ...settings };
      });
      
      return { previousSettings };
    },
    onError: (_, variables, context) => {
      if (context?.previousSettings !== undefined) {
        queryClient.setQueryData(['server-settings', variables.serverId], context.previousSettings);
      }
      toast.error('Erreur lors de la sauvegarde');
    },
    onSuccess: () => {
      toast.success('Paramètres sauvegardés');
    },
    onSettled: (_, __, { serverId }) => {
      queryClient.invalidateQueries({ queryKey: ['server-settings', serverId] });
    },
  });
}
