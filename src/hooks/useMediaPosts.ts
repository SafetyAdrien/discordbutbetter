import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cacheGetSync, cacheSetAsync } from '@/lib/cache';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface MediaPost {
  id: string;
  channel_id: string;
  author_id: string;
  title: string;
  description: string;
  file_url: string;
  file_type: string;
  file_name: string;
  file_size: number;
  alt_text: string;
  is_spoiler: boolean;
  created_at: string;
  // Optimistic-only fields
  _isPending?: boolean;
}

export function useMediaPosts(channelId: string) {
  const queryClient = useQueryClient();
  const channelIdRef = useRef(channelId);
  channelIdRef.current = channelId;

  const query = useQuery<MediaPost[]>({
    queryKey: ['media-posts', channelId],
    placeholderData: () => {
      try {
        const cached = sessionStorage.getItem(`cache:media-posts:${channelId}`);
        return cached ? JSON.parse(cached) : undefined;
      } catch { return undefined; }
    },
    queryFn: async () => {
      const { data, error } = await supabase
        .from('media_posts')
        .select('*')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as MediaPost[];
    },
    enabled: !!channelId,
  });

  // Realtime subscription
  useEffect(() => {
    if (!channelId) return;

    const channel = supabase
      .channel(`media-posts-${channelId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'media_posts' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newPost = payload.new as MediaPost;
            if (newPost.channel_id !== channelIdRef.current) return;
            queryClient.setQueryData<MediaPost[]>(
              ['media-posts', channelIdRef.current],
              (old = []) => {
                // Skip if already present (optimistic update)
                if (old.some((p) => p.id === newPost.id)) {
                  // Replace optimistic entry with real data
                  return old.map((p) => (p.id === newPost.id ? { ...newPost, _isPending: false } : p));
                }
                return [newPost, ...old];
              }
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as { id: string }).id;
            queryClient.setQueryData<MediaPost[]>(
              ['media-posts', channelIdRef.current],
              (old = []) => old.filter((p) => p.id !== deletedId)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, queryClient]);

  // Persist to sessionStorage
  useEffect(() => {
    if (query.data && channelId && !query.isPlaceholderData) {
      try { sessionStorage.setItem(`cache:media-posts:${channelId}`, JSON.stringify(query.data)); } catch {}
    }
  }, [query.data, channelId, query.isPlaceholderData]);

  return query;
}

interface CreateMediaPostInput {
  file: File;
  title: string;
  description: string;
  altText: string;
  isSpoiler: boolean;
}

export function useCreateMediaPost(channelId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateMediaPostInput) => {
      const userId = user?.id;
      if (!userId) throw new Error('Non authentifié');

      // 1. Upload file
      const ext = input.file.name.split('.').pop() || 'bin';
      const filePath = `media/${channelId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('message-attachments')
        .upload(filePath, input.file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('message-attachments')
        .getPublicUrl(filePath);

      // 2. Insert row
      const row = {
        channel_id: channelId,
        author_id: userId,
        title: input.title,
        description: input.description,
        file_url: urlData.publicUrl,
        file_type: input.file.type.startsWith('video/') ? 'video' : 'image',
        file_name: input.file.name,
        file_size: input.file.size,
        alt_text: input.altText,
        is_spoiler: input.isSpoiler,
      };

      const { data, error } = await (supabase
        .from('media_posts') as any)
        .insert(row)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as MediaPost;
    },

    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ['media-posts', channelId] });
      const previous = queryClient.getQueryData<MediaPost[]>(['media-posts', channelId]);

      const optimisticId = crypto.randomUUID();
      const optimisticPost: MediaPost = {
        id: optimisticId,
        channel_id: channelId,
        author_id: user?.id ?? '',
        title: input.title,
        description: input.description,
        file_url: URL.createObjectURL(input.file),
        file_type: input.file.type.startsWith('video/') ? 'video' : 'image',
        file_name: input.file.name,
        file_size: input.file.size,
        alt_text: input.altText,
        is_spoiler: input.isSpoiler,
        created_at: new Date().toISOString(),
        _isPending: true,
      };

      queryClient.setQueryData<MediaPost[]>(
        ['media-posts', channelId],
        (old = []) => [optimisticPost, ...old]
      );

      return { previous, optimisticId };
    },

    onSuccess: (data, _input, context) => {
      // Replace optimistic entry with real data
      queryClient.setQueryData<MediaPost[]>(
        ['media-posts', channelId],
        (old = []) =>
          old.map((p) => (p.id === context?.optimisticId ? { ...data, _isPending: false } : p))
      );
    },

    onError: (_err, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['media-posts', channelId], context.previous);
      }
      toast.error('Erreur lors de la publication du média');
    },
  });
}
