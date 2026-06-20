import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cacheGetSync, cacheSetAsync } from '@/lib/cache';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ServerEmoji {
  id: string;
  name: string;
  url: string;
  server_id: string;
  created_at: string | null;
}

export interface ServerSticker {
  id: string;
  name: string;
  description: string | null;
  url: string;
  server_id: string;
  created_at: string | null;
}

export function useServerEmojis(serverId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!serverId) return;

    const channel = supabase
      .channel(`server-emojis-rt-${serverId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'server_emojis', filter: `server_id=eq.${serverId}` },
        () => {
          clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['server-emojis', serverId] });
          }, 300);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [serverId, queryClient]);

  const query = useQuery({
    queryKey: ['server-emojis', serverId],
    placeholderData: () => cacheGetSync(`server-emojis:${serverId}`),
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

  useEffect(() => {
    if (query.data && serverId && !query.isPlaceholderData) {
      cacheSetAsync(`server-emojis:${serverId}`, query.data);
    }
  }, [query.data, serverId, query.isPlaceholderData]);

  return query;
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
      silent?: boolean;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const fileExt = (file.name.split('.').pop() || 'png').toLowerCase();
      const fileName = `${serverId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${name}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('server-emojis')
        .upload(fileName, file, { upsert: false, contentType: file.type || undefined });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('server-emojis')
        .getPublicUrl(fileName);

      const { data, error } = await supabase
        .from('server_emojis' as any)
        .insert({
          server_id: serverId,
          name,
          url: publicUrl,
          creator_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as ServerEmoji;
    },
    onMutate: async ({ serverId, name, file }) => {
      if (!user) return;

      await queryClient.cancelQueries({ queryKey: ['server-emojis', serverId] });
      const previous = queryClient.getQueryData(['server-emojis', serverId]);

      const blobUrl = URL.createObjectURL(file);
      const tempEmoji: ServerEmoji = {
        id: `temp-${Date.now()}`,
        name,
        url: blobUrl,
        server_id: serverId,
        created_at: new Date().toISOString(),
      };

      queryClient.setQueryData(['server-emojis', serverId], (old: ServerEmoji[] | undefined) =>
        old ? [tempEmoji, ...old] : [tempEmoji]
      );

      return { previous, serverId, blobUrl };
    },
    onError: (error: any, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['server-emojis', variables.serverId], context.previous);
      }
      if (context?.blobUrl) URL.revokeObjectURL(context.blobUrl);
      if (variables.silent) return;
      if (error.message?.includes('duplicate')) {
        toast.error('Un emoji avec ce nom existe déjà');
      } else {
        toast.error('Erreur lors de l\'ajout de l\'emoji');
      }
    },
    onSuccess: (_, variables, context) => {
      if (context?.blobUrl) URL.revokeObjectURL(context.blobUrl);
      if (!variables.silent) toast.success('Emoji ajouté !');
    },
    onSettled: (_, __, { serverId }) => {
      queryClient.invalidateQueries({ queryKey: ['server-emojis', serverId] });
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
  const queryClient = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!serverId) return;

    const channel = supabase
      .channel(`server-stickers-rt-${serverId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'server_stickers', filter: `server_id=eq.${serverId}` },
        () => {
          clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['server-stickers', serverId] });
          }, 300);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [serverId, queryClient]);

  const query = useQuery({
    queryKey: ['server-stickers', serverId],
    placeholderData: () => cacheGetSync(`server-stickers:${serverId}`),
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

  useEffect(() => {
    if (query.data && serverId && !query.isPlaceholderData) {
      cacheSetAsync(`server-stickers:${serverId}`, query.data);
    }
  }, [query.data, serverId, query.isPlaceholderData]);

  return query;
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
      silent?: boolean;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const fileExt = file.name.split('.').pop();
      const fileName = `${serverId}/${Date.now()}-${name}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('server-stickers')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('server-stickers')
        .getPublicUrl(fileName);

      const { data, error } = await supabase
        .from('server_stickers' as any)
        .insert({
          server_id: serverId,
          name,
          description: description || null,
          url: publicUrl,
          creator_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as ServerSticker;
    },
    onMutate: async ({ serverId, name, description, file }) => {
      if (!user) return;

      await queryClient.cancelQueries({ queryKey: ['server-stickers', serverId] });
      const previous = queryClient.getQueryData(['server-stickers', serverId]);

      const blobUrl = URL.createObjectURL(file);
      const tempSticker: ServerSticker = {
        id: `temp-${Date.now()}`,
        name,
        description: description || null,
        url: blobUrl,
        server_id: serverId,
        created_at: new Date().toISOString(),
      };

      queryClient.setQueryData(['server-stickers', serverId], (old: ServerSticker[] | undefined) =>
        old ? [tempSticker, ...old] : [tempSticker]
      );

      return { previous, serverId, blobUrl };
    },
    onError: (_, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['server-stickers', variables.serverId], context.previous);
      }
      if (context?.blobUrl) URL.revokeObjectURL(context.blobUrl);
      if (!variables.silent) toast.error('Erreur lors de l\'ajout du sticker');
    },
    onSuccess: (_, variables, context) => {
      if (context?.blobUrl) URL.revokeObjectURL(context.blobUrl);
      if (!variables.silent) toast.success('Sticker ajouté !');
    },
    onSettled: (_, __, { serverId }) => {
      queryClient.invalidateQueries({ queryKey: ['server-stickers', serverId] });
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
    onMutate: async ({ serverId, file }) => {
      await queryClient.cancelQueries({ queryKey: ['servers'] });
      const previousServers = queryClient.getQueryData(['servers']);

      const blobUrl = URL.createObjectURL(file);
      queryClient.setQueriesData({ queryKey: ['servers'] }, (old: any) => {
        if (Array.isArray(old)) {
          return old.map((s: any) => s.id === serverId ? { ...s, icon_url: blobUrl } : s);
        }
        return old;
      });

      return { previousServers, blobUrl };
    },
    onError: (_, __, context) => {
      if (context?.previousServers) {
        queryClient.setQueryData(['servers'], context.previousServers);
      }
      if (context?.blobUrl) URL.revokeObjectURL(context.blobUrl);
      toast.error('Erreur lors du téléchargement de l\'icône');
    },
    onSuccess: (_, __, context) => {
      if (context?.blobUrl) URL.revokeObjectURL(context.blobUrl);
      toast.success('Icône du serveur mise à jour !');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
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
    onMutate: async ({ serverId, file }) => {
      await queryClient.cancelQueries({ queryKey: ['servers'] });
      const previousServers = queryClient.getQueryData(['servers']);

      const blobUrl = URL.createObjectURL(file);
      queryClient.setQueriesData({ queryKey: ['servers'] }, (old: any) => {
        if (Array.isArray(old)) {
          return old.map((s: any) => s.id === serverId ? { ...s, banner_url: blobUrl } : s);
        }
        return old;
      });

      return { previousServers, blobUrl };
    },
    onError: (_, __, context) => {
      if (context?.previousServers) {
        queryClient.setQueryData(['servers'], context.previousServers);
      }
      if (context?.blobUrl) URL.revokeObjectURL(context.blobUrl);
      toast.error('Erreur lors du téléchargement de la bannière');
    },
    onSuccess: (_, __, context) => {
      if (context?.blobUrl) URL.revokeObjectURL(context.blobUrl);
      toast.success('Bannière du serveur mise à jour !');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
    },
  });
}

// ============== SOUNDBOARD ==============

export interface ServerSound {
  id: string;
  name: string;
  emoji: string | null;
  url: string; // storage path
  signedUrl?: string;
  volume: number;
  server_id: string;
  creator_id: string | null;
  created_at: string | null;
}

async function signSoundUrls(rows: ServerSound[]): Promise<ServerSound[]> {
  if (rows.length === 0) return rows;
  const paths = rows.map((r) => r.url);
  const { data, error } = await supabase.storage
    .from('server-sounds')
    .createSignedUrls(paths, 60 * 60 * 24);
  if (error || !data) return rows;
  return rows.map((r, i) => ({ ...r, signedUrl: data[i]?.signedUrl ?? undefined }));
}

export function useServerSounds(serverId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!serverId) return;
    const channel = supabase
      .channel(`server-sounds-rt-${serverId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'server_sounds', filter: `server_id=eq.${serverId}` },
        () => {
          clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['server-sounds', serverId] });
          }, 300);
        }
      )
      .subscribe();
    return () => {
      clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [serverId, queryClient]);

  const query = useQuery({
    queryKey: ['server-sounds', serverId],
    placeholderData: () => cacheGetSync(`server-sounds:${serverId}`),
    queryFn: async (): Promise<ServerSound[]> => {
      if (!serverId) return [];
      const { data, error } = await supabase
        .from('server_sounds' as any)
        .select('*')
        .eq('server_id', serverId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return await signSoundUrls((data || []) as unknown as ServerSound[]);
    },
    enabled: !!serverId && !!user,
  });

  useEffect(() => {
    if (query.data && serverId && !query.isPlaceholderData) {
      cacheSetAsync(`server-sounds:${serverId}`, query.data);
    }
  }, [query.data, serverId, query.isPlaceholderData]);

  return query;
}

export function useUploadSound() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      serverId,
      name,
      emoji,
      volume,
      file,
    }: {
      serverId: string;
      name: string;
      emoji?: string;
      volume?: number;
      file: File;
      silent?: boolean;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const fileExt = file.name.split('.').pop() || 'mp3';
      const path = `${serverId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('server-sounds')
        .upload(path, file, { contentType: file.type || 'audio/mpeg' });
      if (uploadError) throw uploadError;

      const { data, error } = await supabase
        .from('server_sounds' as any)
        .insert({
          server_id: serverId,
          name,
          emoji: emoji || null,
          url: path,
          volume: volume ?? 1.0,
          creator_id: user.id,
        })
        .select()
        .single();

      if (error) {
        await supabase.storage.from('server-sounds').remove([path]);
        throw error;
      }
      return data as unknown as ServerSound;
    },
    onError: (error: any, variables) => {
      if (variables?.silent) return;
      if (error?.message?.includes('row-level security') || error?.message?.includes('permission')) {
        toast.error("Vous n'avez pas la permission d'ajouter des sons");
      } else {
        toast.error("Erreur lors de l'ajout du son");
      }
    },
    onSuccess: (_, variables) => {
      if (!variables?.silent) toast.success('Son ajouté !');
    },
    onSettled: (_, __, { serverId }) => {
      queryClient.invalidateQueries({ queryKey: ['server-sounds', serverId] });
    },
  });
}

export function useDeleteSound() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ soundId, serverId, path }: { soundId: string; serverId: string; path?: string }) => {
      const { error } = await supabase.from('server_sounds' as any).delete().eq('id', soundId);
      if (error) throw error;
      if (path) {
        await supabase.storage.from('server-sounds').remove([path]);
      }
      return { serverId };
    },
    onMutate: async ({ soundId, serverId }) => {
      await queryClient.cancelQueries({ queryKey: ['server-sounds', serverId] });
      const previous = queryClient.getQueryData(['server-sounds', serverId]);
      queryClient.setQueryData(['server-sounds', serverId], (old: ServerSound[] | undefined) =>
        old?.filter((s) => s.id !== soundId)
      );
      return { previous };
    },
    onError: (_, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['server-sounds', variables.serverId], context.previous);
      }
      toast.error('Erreur lors de la suppression du son');
    },
    onSuccess: () => {
      toast.success('Son supprimé !');
    },
    onSettled: (_, __, { serverId }) => {
      queryClient.invalidateQueries({ queryKey: ['server-sounds', serverId] });
    },
  });
}
