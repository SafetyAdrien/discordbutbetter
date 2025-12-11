import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ServerEmoji {
  id: string;
  name: string;
  image_url: string;
  server_id: string;
  created_at: string | null;
}

export interface ServerSticker {
  id: string;
  name: string;
  description: string | null;
  image_url: string;
  server_id: string;
  created_at: string | null;
}

export function useServerEmojis(serverId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['server-emojis', serverId],
    queryFn: async (): Promise<ServerEmoji[]> => {
      if (!serverId) return [];

      const { data, error } = await supabase
        .from('server_emojis' as any)
        .select('*')
        .eq('server_id', serverId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as ServerEmoji[];
    },
    enabled: !!serverId && !!user,
  });
}

export function useUploadEmoji() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      serverId,
      name,
      file,
    }: {
      serverId: string;
      name: string;
      file: File;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const fileExt = file.name.split('.').pop();
      const fileName = `${serverId}/${name}.${fileExt}`;

      // Upload file
      const { error: uploadError } = await supabase.storage
        .from('server-emojis')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('server-emojis')
        .getPublicUrl(fileName);

      // Create emoji record
      const { data, error } = await supabase
        .from('server_emojis' as any)
        .insert({
          server_id: serverId,
          name,
          image_url: publicUrl,
          uploaded_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as ServerEmoji;
    },
    onSuccess: (_, { serverId }) => {
      queryClient.invalidateQueries({ queryKey: ['server-emojis', serverId] });
      toast.success('Emoji ajouté !');
    },
    onError: (error: any) => {
      if (error.message?.includes('duplicate')) {
        toast.error('Un emoji avec ce nom existe déjà');
      } else {
        toast.error('Erreur lors de l\'ajout de l\'emoji');
      }
    },
  });
}

export function useDeleteEmoji() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ emojiId, serverId }: { emojiId: string; serverId: string }) => {
      const { error } = await supabase
        .from('server_emojis' as any)
        .delete()
        .eq('id', emojiId);

      if (error) throw error;
      return { serverId };
    },
    onSuccess: (_, { serverId }) => {
      queryClient.invalidateQueries({ queryKey: ['server-emojis', serverId] });
      toast.success('Emoji supprimé !');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression de l\'emoji');
    },
  });
}

export function useServerStickers(serverId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['server-stickers', serverId],
    queryFn: async (): Promise<ServerSticker[]> => {
      if (!serverId) return [];

      const { data, error } = await supabase
        .from('server_stickers' as any)
        .select('*')
        .eq('server_id', serverId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as ServerSticker[];
    },
    enabled: !!serverId && !!user,
  });
}

export function useUploadSticker() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      serverId,
      name,
      description,
      file,
    }: {
      serverId: string;
      name: string;
      description?: string;
      file: File;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const fileExt = file.name.split('.').pop();
      const fileName = `${serverId}/${Date.now()}-${name}.${fileExt}`;

      // Upload file
      const { error: uploadError } = await supabase.storage
        .from('server-stickers')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('server-stickers')
        .getPublicUrl(fileName);

      // Create sticker record
      const { data, error } = await supabase
        .from('server_stickers' as any)
        .insert({
          server_id: serverId,
          name,
          description: description || null,
          image_url: publicUrl,
          uploaded_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as ServerSticker;
    },
    onSuccess: (_, { serverId }) => {
      queryClient.invalidateQueries({ queryKey: ['server-stickers', serverId] });
      toast.success('Sticker ajouté !');
    },
    onError: () => {
      toast.error('Erreur lors de l\'ajout du sticker');
    },
  });
}

export function useDeleteSticker() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ stickerId, serverId }: { stickerId: string; serverId: string }) => {
      const { error } = await supabase
        .from('server_stickers' as any)
        .delete()
        .eq('id', stickerId);

      if (error) throw error;
      return { serverId };
    },
    onSuccess: (_, { serverId }) => {
      queryClient.invalidateQueries({ queryKey: ['server-stickers', serverId] });
      toast.success('Sticker supprimé !');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression du sticker');
    },
  });
}

export function useUpdateServerInfo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      serverId,
      name,
      description,
      is_public,
    }: {
      serverId: string;
      name?: string;
      description?: string;
      is_public?: boolean;
    }) => {
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (is_public !== undefined) updateData.is_public = is_public;

      const { error } = await supabase
        .from('servers')
        .update(updateData)
        .eq('id', serverId);

      if (error) throw error;
      return { serverId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      toast.success('Serveur mis à jour !');
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour du serveur');
    },
  });
}

export function useUploadServerIcon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ serverId, file }: { serverId: string; file: File }) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${serverId}/icon.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('server-icons')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('server-icons')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('servers')
        .update({ icon_url: `${publicUrl}?t=${Date.now()}` })
        .eq('id', serverId);

      if (updateError) throw updateError;
      return publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      toast.success('Icône du serveur mise à jour !');
    },
    onError: () => {
      toast.error('Erreur lors du téléchargement de l\'icône');
    },
  });
}

export function useUploadServerBanner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ serverId, file }: { serverId: string; file: File }) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${serverId}/banner.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('server-banners')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('server-banners')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('servers')
        .update({ banner_url: `${publicUrl}?t=${Date.now()}` })
        .eq('id', serverId);

      if (updateError) throw updateError;
      return publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      toast.success('Bannière du serveur mise à jour !');
    },
    onError: () => {
      toast.error('Erreur lors du téléchargement de la bannière');
    },
  });
}
