import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ServerProfile {
  id: string;
  user_id: string;
  server_id: string;
  display_name: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  pronouns: string | null;
  created_at: string;
  updated_at: string;
}

export function useServerProfile(userId: string | null, serverId: string | null) {
  return useQuery({
    queryKey: ['server-profile', userId, serverId],
    queryFn: async () => {
      if (!userId || !serverId) return null;
      const { data, error } = await supabase
        .from('server_profiles')
        .select('*')
        .eq('user_id', userId)
        .eq('server_id', serverId)
        .maybeSingle();
      if (error) throw error;
      return data as ServerProfile | null;
    },
    enabled: !!userId && !!serverId,
  });
}

export function useUpdateServerProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      serverId,
      updates,
    }: {
      serverId: string;
      updates: Partial<Pick<ServerProfile, 'display_name' | 'avatar_url' | 'banner_url' | 'bio' | 'pronouns'>>;
    }) => {
      if (!user) throw new Error('Not authenticated');

      // Check if profile exists
      const { data: existing } = await supabase
        .from('server_profiles')
        .select('id')
        .eq('user_id', user.id)
        .eq('server_id', serverId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('server_profiles')
          .update(updates)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('server_profiles')
          .insert({ user_id: user.id, server_id: serverId, ...updates });
        if (error) throw error;
      }
    },
    onSuccess: (_, { serverId }) => {
      queryClient.invalidateQueries({ queryKey: ['server-profile', user?.id, serverId] });
      queryClient.invalidateQueries({ queryKey: ['members', serverId] });
      toast.success('Profil serveur mis à jour');
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour du profil serveur');
    },
  });
}

export function useDeleteServerProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (serverId: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('server_profiles')
        .delete()
        .eq('user_id', user.id)
        .eq('server_id', serverId);
      if (error) throw error;
    },
    onSuccess: (_, serverId) => {
      queryClient.invalidateQueries({ queryKey: ['server-profile', user?.id, serverId] });
      queryClient.invalidateQueries({ queryKey: ['members', serverId] });
      toast.success('Profil serveur réinitialisé');
    },
  });
}

export function useUploadServerAvatar() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ serverId, file }: { serverId: string; file: File }) => {
      if (!user) throw new Error('Not authenticated');
      const ext = file.name.split('.').pop();
      const path = `${user.id}/server-${serverId}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      return publicUrl;
    },
    onSuccess: (_, { serverId }) => {
      queryClient.invalidateQueries({ queryKey: ['server-profile', user?.id, serverId] });
    },
  });
}

export function useUploadServerBanner() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ serverId, file }: { serverId: string; file: File }) => {
      if (!user) throw new Error('Not authenticated');
      const ext = file.name.split('.').pop();
      const path = `${user.id}/server-${serverId}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('banners')
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('banners').getPublicUrl(path);
      return publicUrl;
    },
    onSuccess: (_, { serverId }) => {
      queryClient.invalidateQueries({ queryKey: ['server-profile', user?.id, serverId] });
    },
  });
}
