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
    onSuccess: (_, { serverId }) => {
      queryClient.invalidateQueries({ queryKey: ['server-settings', serverId] });
      toast.success('Paramètres sauvegardés');
    },
    onError: () => {
      toast.error('Erreur lors de la sauvegarde');
    },
  });
}
