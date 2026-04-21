import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface RepliedMediaCommentSnapshot {
  id: string;
  content: string;
  deleted?: boolean;
  author: { id: string; display_name: string; avatar_url: string | null } | null;
}

export interface MediaComment {
  id: string;
  post_id: string;
  content: string;
  created_at: string;
  edited_at?: string | null;
  reply_to_id?: string | null;
  repliedComment?: RepliedMediaCommentSnapshot | null;
  author: {
    id: string;
    display_name: string;
    avatar_url?: string | null;
  };
}

export function useMediaComments(postId: string) {
  const queryClient = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!postId) return;

    const channel = supabase
      .channel(`media-comments-rt-${postId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'media_post_comments', filter: `post_id=eq.${postId}` },
        () => {
          clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['media-comments', postId] });
          }, 300);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [postId, queryClient]);

  return useQuery({
    queryKey: ['media-comments', postId],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('media_post_comments') as any)
        .select(`
          *,
          author:profiles!author_id(id, display_name, avatar_url)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      const comments = (data ?? []) as unknown as MediaComment[];

      // Batch-resolve replied comments
      const replyIds = Array.from(
        new Set(
          comments
            .map((c) => c.reply_to_id)
            .filter((id): id is string => Boolean(id))
        )
      );

      const repliedMap = new Map<string, RepliedMediaCommentSnapshot>();
      if (replyIds.length > 0) {
        const { data: repliedData } = await (supabase
          .from('media_post_comments') as any)
          .select(`
            id,
            content,
            author:profiles!author_id(id, display_name, avatar_url)
          `)
          .in('id', replyIds);

        if (repliedData) {
          for (const r of repliedData as unknown as Array<{
            id: string;
            content: string;
            author: { id: string; display_name: string; avatar_url: string | null } | null;
          }>) {
            repliedMap.set(r.id, {
              id: r.id,
              content: r.content,
              deleted: false,
              author: r.author,
            });
          }
        }
      }

      return comments.map((c) => {
        if (!c.reply_to_id) return c;
        const snap = repliedMap.get(c.reply_to_id);
        return {
          ...c,
          repliedComment: snap ?? {
            id: c.reply_to_id,
            content: '',
            deleted: true,
            author: null,
          },
        };
      });
    },
    enabled: !!postId,
  });
}

export function useAddMediaComment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: { postId: string; content: string; replyToId?: string | null }) => {
      const { data: result, error } = await (supabase
        .from('media_post_comments') as any)
        .insert({
          post_id: data.postId,
          author_id: user?.id,
          content: data.content,
          reply_to_id: data.replyToId ?? null,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onMutate: async (data) => {
      if (!user) return;

      await queryClient.cancelQueries({ queryKey: ['media-comments', data.postId] });
      const previousComments = queryClient.getQueryData<MediaComment[]>(['media-comments', data.postId]);

      let repliedComment: RepliedMediaCommentSnapshot | null = null;
      if (data.replyToId && previousComments) {
        const target = previousComments.find((c) => c.id === data.replyToId);
        if (target) {
          repliedComment = {
            id: target.id,
            content: target.content,
            deleted: false,
            author: target.author
              ? {
                  id: target.author.id,
                  display_name: target.author.display_name,
                  avatar_url: target.author.avatar_url ?? null,
                }
              : null,
          };
        }
      }

      const tempComment: MediaComment = {
        id: `temp-${Date.now()}`,
        post_id: data.postId,
        content: data.content,
        created_at: new Date().toISOString(),
        reply_to_id: data.replyToId ?? null,
        repliedComment,
        author: {
          id: user.id,
          display_name: user.user_metadata?.display_name || 'Vous',
          avatar_url: user.user_metadata?.avatar_url,
        },
      };

      queryClient.setQueryData(['media-comments', data.postId], (old: MediaComment[] | undefined) =>
        old ? [...old, tempComment] : [tempComment]
      );

      return { previousComments };
    },
    onError: (_, variables, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData(['media-comments', variables.postId], context.previousComments);
      }
      toast.error("Erreur lors de l'ajout du commentaire");
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: ['media-comments', variables.postId] });
    },
  });
}

export function useDeleteMediaComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: string; postId: string }) => {
      const { error } = await (supabase
        .from('media_post_comments') as any)
        .delete()
        .eq('id', data.id);

      if (error) throw error;
    },
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ['media-comments', data.postId] });
      const previousComments = queryClient.getQueryData(['media-comments', data.postId]);

      queryClient.setQueryData(['media-comments', data.postId], (old: MediaComment[] | undefined) =>
        old?.filter(c => c.id !== data.id)
      );

      return { previousComments };
    },
    onError: (_, variables, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData(['media-comments', variables.postId], context.previousComments);
      }
      toast.error('Erreur lors de la suppression');
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: ['media-comments', variables.postId] });
    },
  });
}
