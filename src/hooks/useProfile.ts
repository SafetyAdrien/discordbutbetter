import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ProfileData {
  display_name?: string;
  bio?: string;
  pronouns?: string;
  custom_status?: string;
  profile_theme?: { primary: string; accent: string };
  featured_server_id?: string | null;
  avatar_decoration_url?: string | null;
  avatar_url?: string;
  banner_url?: string;
}

export function useUpdateProfile() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ProfileData) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', user.id);

      if (error) throw error;
      return data;
    },
    onMutate: async (data) => {
      if (!user) return;
      
      await queryClient.cancelQueries({ queryKey: ['profile', user.id] });
      const previousProfile = queryClient.getQueryData(['profile', user.id]);
      
      queryClient.setQueryData(['profile', user.id], (old: ProfileData | undefined) => ({
        ...old,
        ...data,
      }));
      
      return { previousProfile };
    },
    onError: (error: any, _, context) => {
      if (context?.previousProfile) {
        queryClient.setQueryData(['profile', user?.id], context.previousProfile);
      }
      if (error.message?.includes('200 characters')) {
        toast.error('La bio doit faire 200 caractères maximum');
      } else {
        toast.error('Erreur lors de la mise à jour du profil');
      }
    },
    onSuccess: () => {
      toast.success('Profil mis à jour !');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

export function useUploadAvatar() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error('Not authenticated');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Upload file
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const avatarUrl = `${publicUrl}?t=${Date.now()}`;

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      return avatarUrl;
    },
    onMutate: async () => {
      if (!user) return;
      
      await queryClient.cancelQueries({ queryKey: ['profile', user.id] });
      const previousProfile = queryClient.getQueryData(['profile', user.id]);
      
      return { previousProfile };
    },
    onError: (_, __, context) => {
      if (context?.previousProfile) {
        queryClient.setQueryData(['profile', user?.id], context.previousProfile);
      }
      toast.error('Erreur lors du téléchargement de l\'avatar');
    },
    onSuccess: (avatarUrl) => {
      if (user) {
        queryClient.setQueryData(['profile', user.id], (old: ProfileData | undefined) => ({
          ...old,
          avatar_url: avatarUrl,
        }));
      }
      toast.success('Avatar mis à jour !');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

export function useUploadBanner() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error('Not authenticated');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/banner.${fileExt}`;

      // Upload file
      const { error: uploadError } = await supabase.storage
        .from('banners')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('banners')
        .getPublicUrl(fileName);

      const bannerUrl = `${publicUrl}?t=${Date.now()}`;

      // Update profile with new banner URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ banner_url: bannerUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      return bannerUrl;
    },
    onMutate: async () => {
      if (!user) return;
      
      await queryClient.cancelQueries({ queryKey: ['profile', user.id] });
      const previousProfile = queryClient.getQueryData(['profile', user.id]);
      
      return { previousProfile };
    },
    onError: (_, __, context) => {
      if (context?.previousProfile) {
        queryClient.setQueryData(['profile', user?.id], context.previousProfile);
      }
      toast.error('Erreur lors du téléchargement de la bannière');
    },
    onSuccess: (bannerUrl) => {
      if (user) {
        queryClient.setQueryData(['profile', user.id], (old: ProfileData | undefined) => ({
          ...old,
          banner_url: bannerUrl,
        }));
      }
      toast.success('Bannière mise à jour !');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}
