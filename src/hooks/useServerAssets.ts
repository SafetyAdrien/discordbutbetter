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
    onMutate: async ({ emojiId, serverId }) => {
      await queryClient.cancelQueries({ queryKey: ['server-emojis', serverId] });
      const previousEmojis = queryClient.getQueryData(['server-emojis', serverId]);
      
      queryClient.setQueryData(['server-emojis', serverId], (old: ServerEmoji[] | undefined) =>
        old?.filter(e => e.id !== emojiId)
      );
      
      return { previousEmojis };
    },
    onError: (_, variables, context) => {
      if (context?.previousEmojis) {
        queryClient.setQueryData(['server-emojis', variables.serverId], context.previousEmojis);
      }
      toast.error('Erreur lors de la suppression de l\'emoji');
    },
    onSuccess: () => {
      toast.success('Emoji supprimé !');
    },
    onSettled: (_, __, { serverId }) => {
      queryClient.invalidateQueries({ queryKey: ['server-emojis', serverId] });
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
    onMutate: async ({ stickerId, serverId }) => {
      await queryClient.cancelQueries({ queryKey: ['server-stickers', serverId] });
      const previousStickers = queryClient.getQueryData(['server-stickers', serverId]);
      
      queryClient.setQueryData(['server-stickers', serverId], (old: ServerSticker[] | undefined) =>
        old?.filter(s => s.id !== stickerId)
      );
      
      return { previousStickers };
    },
    onError: (_, variables, context) => {
      if (context?.previousStickers) {
        queryClient.setQueryData(['server-stickers', variables.serverId], context.previousStickers);
      }
      toast.error('Erreur lors de la suppression du sticker');
    },
    onSuccess: () => {
      toast.success('Sticker supprimé !');
    },
    onSettled: (_, __, { serverId }) => {
      queryClient.invalidateQueries({ queryKey: ['server-stickers', serverId] });
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
      return { serverId, name, description, is_public };
    },
    onMutate: async ({ serverId, name, description, is_public }) => {
      await queryClient.cancelQueries({ queryKey: ['servers'] });
      const previousServers = queryClient.getQueryData(['servers']);
      
      queryClient.setQueriesData({ queryKey: ['servers'] }, (old: any) => {
        if (Array.isArray(old)) {
          return old.map((s: any) => s.id === serverId ? {
            ...s,
            name: name ?? s.name,
            description: description ?? s.description,
            is_public: is_public ?? s.is_public,
          } : s);
        }
        return old;
      });
      
      return { previousServers };
    },
    onError: (_, __, context) => {
      if (context?.previousServers) {
        queryClient.setQueryData(['servers'], context.previousServers);
      }
      toast.error('Erreur lors de la mise à jour du serveur');
    },
    onSuccess: () => {
      toast.success('Serveur mis à jour !');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
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
