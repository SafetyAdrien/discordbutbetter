import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cacheGetSync, cacheSetAsync } from '@/lib/cache';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface MediaPostItem {
  id: string;
  post_id: string;
  file_url: string;
  file_type: string;
  file_name: string;
  file_size: number;
  alt_text: string | null;
  position: number;
  created_at: string;
}

export interface MediaPost {
  id: string;
  channel_id: string;
  author_id: string;
  title: string;
  description: string;
  // Legacy single-file columns (kept for backward compat — superseded by items[0])
  file_url: string;
  file_type: string;
  file_name: string;
  file_size: number;
  alt_text: string;
  is_spoiler: boolean;
  created_at: string;
  items: MediaPostItem[];
  // Optimistic-only fields
  _isPending?: boolean;
}

export function useMediaPosts(channelId: string) {
  const queryClient = useQueryClient();
  const channelIdRef = useRef(channelId);
  channelIdRef.current = channelId;

  const query = useQuery<MediaPost[]>({
    queryKey: ['media-posts', channelId],
    placeholderData: () => cacheGetSync(`media-posts:${channelId}`),
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('media_posts') as any)
        .select('*, items:media_post_items(*)')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as any[];
      // Sort items by position, fallback to legacy file_url if items empty
      const normalized: MediaPost[] = rows.map((r) => {
        const items: MediaPostItem[] = (r.items ?? []).slice().sort(
          (a: MediaPostItem, b: MediaPostItem) => a.position - b.position
        );
        const fallbackItems: MediaPostItem[] =
          items.length === 0 && r.file_url
            ? [{
                id: `legacy-${r.id}`,
                post_id: r.id,
                file_url: r.file_url,
                file_type: r.file_type ?? 'image',
                file_name: r.file_name ?? '',
                file_size: r.file_size ?? 0,
                alt_text: r.alt_text ?? null,
                position: 0,
                created_at: r.created_at,
              }]
            : items;
        return { ...r, items: fallbackItems } as MediaPost;
      });
      return normalized;
    },
    enabled: !!channelId,
  });

  // Realtime subscription (posts + items)
  useEffect(() => {
    if (!channelId) return;

    const refetchDebounced = (() => {
      let t: ReturnType<typeof setTimeout> | undefined;
      return () => {
        clearTimeout(t);
        t = setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['media-posts', channelIdRef.current] });
        }, 200);
      };
    })();

    const postsChannel = supabase
      .channel(`media-posts-${channelId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'media_posts' },
        (payload) => {
          const rec = (payload.new || payload.old) as { channel_id?: string } | undefined;
          if (rec?.channel_id !== channelIdRef.current) return;
          if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as { id: string }).id;
            queryClient.setQueryData<MediaPost[]>(
              ['media-posts', channelIdRef.current],
              (old = []) => old.filter((p) => p.id !== deletedId)
            );
          } else {
            refetchDebounced();
          }
        }
      )
      .subscribe();

    const itemsChannel = supabase
      .channel(`media-post-items-${channelId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'media_post_items' },
        () => refetchDebounced()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(itemsChannel);
    };
  }, [channelId, queryClient]);

  // Persist to sessionStorage
  useEffect(() => {
    if (query.data && channelId && !query.isPlaceholderData) {
      cacheSetAsync(`media-posts:${channelId}`, query.data);
    }
  }, [query.data, channelId, query.isPlaceholderData]);

  return query;
}

interface CreateMediaPostInput {
  files: File[];
  altTexts?: string[];
  title: string;
  description: string;
  isSpoiler: boolean;
}

export function useCreateMediaPost(channelId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateMediaPostInput) => {
      const userId = user?.id;
      if (!userId) throw new Error('Non authentifié');
      if (!input.files.length) throw new Error('Aucun fichier');

      // 1. Parallel upload of all files
      const uploaded = await Promise.all(
        input.files.map(async (file) => {
          const ext = file.name.split('.').pop() || 'bin';
          const filePath = `media/${channelId}/${crypto.randomUUID()}.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from('message-attachments')
            .upload(filePath, file);
          if (uploadError) throw uploadError;
          const { data: urlData, error: signErr } = await supabase.storage
            .from('message-attachments')
            .createSignedUrl(filePath, 60 * 60 * 24 * 365);
          if (signErr || !urlData) throw signErr ?? new Error('Sign URL failed');
          return {
            file,
            url: urlData.signedUrl,
            type: file.type.startsWith('video/') ? 'video' : 'image',
          };
        })
      );

      const first = uploaded[0];

      // 2. Insert media_posts (use first file as legacy fields for backward compat)
      const postRow = {
        channel_id: channelId,
        author_id: userId,
        title: input.title,
        description: input.description,
        file_url: first.url,
        file_type: first.type,
        file_name: first.file.name,
        file_size: first.file.size,
        alt_text: input.altTexts?.[0] ?? '',
        is_spoiler: input.isSpoiler,
      };

      const { data: post, error } = await (supabase
        .from('media_posts') as any)
        .insert(postRow)
        .select()
        .single();
      if (error) throw error;

      // 3. Insert items
      const itemRows = uploaded.map((u, idx) => ({
        post_id: post.id,
        file_url: u.url,
        file_type: u.type,
        file_name: u.file.name,
        file_size: u.file.size,
        alt_text: input.altTexts?.[idx] ?? '',
        position: idx,
      }));
      const { error: itemsError } = await (supabase
        .from('media_post_items') as any)
        .insert(itemRows);
      if (itemsError) throw itemsError;

      return post as unknown as MediaPost;
    },

    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ['media-posts', channelId] });
      const previous = queryClient.getQueryData<MediaPost[]>(['media-posts', channelId]);

      const optimisticId = crypto.randomUUID();
      const items: MediaPostItem[] = input.files.map((file, idx) => ({
        id: `${optimisticId}-${idx}`,
        post_id: optimisticId,
        file_url: URL.createObjectURL(file),
        file_type: file.type.startsWith('video/') ? 'video' : 'image',
        file_name: file.name,
        file_size: file.size,
        alt_text: input.altTexts?.[idx] ?? '',
        position: idx,
        created_at: new Date().toISOString(),
      }));

      const optimisticPost: MediaPost = {
        id: optimisticId,
        channel_id: channelId,
        author_id: user?.id ?? '',
        title: input.title,
        description: input.description,
        file_url: items[0].file_url,
        file_type: items[0].file_type,
        file_name: items[0].file_name,
        file_size: items[0].file_size,
        alt_text: items[0].alt_text ?? '',
        is_spoiler: input.isSpoiler,
        created_at: new Date().toISOString(),
        items,
        _isPending: true,
      };

      queryClient.setQueryData<MediaPost[]>(
        ['media-posts', channelId],
        (old = []) => [optimisticPost, ...old]
      );

      return { previous, optimisticId };
    },

    onSuccess: (_data, _input, context) => {
      // Drop optimistic — realtime will deliver the authoritative row with items
      queryClient.setQueryData<MediaPost[]>(
        ['media-posts', channelId],
        (old = []) => old.filter((p) => p.id !== context?.optimisticId)
      );
      queryClient.invalidateQueries({ queryKey: ['media-posts', channelId] });
    },

    onError: (_err, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['media-posts', channelId], context.previous);
      }
      toast.error('Erreur lors de la publication du média');
    },
  });
}
