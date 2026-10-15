import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { MediaPost } from '@/hooks/useMediaPosts';

/**
 * Moderator actions on a media post.
 *
 * In Fluxer a media channel is a forum, so posts carry the same state machine:
 * pinned, locked, archived. `media_posts` now has those columns (migration
 * 20261015000000) but nothing wrote them before.
 *
 * Writes are optimistic and guarded by the RLS policy
 * "Moderators can pin media posts"; RLS has the final say.
 */
export function useUpdateMediaPost(channelId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      postId,
      ...patch
    }: {
      postId: string;
      is_pinned?: boolean;
      is_locked?: boolean;
      archived?: boolean;
    }) => {
      const { error } = await supabase
        .from('media_posts')
        .update(patch)
        .eq('id', postId);
      if (error) throw error;
      return patch;
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['media-posts', channelId] });
      const previous = queryClient.getQueryData<MediaPost[]>(['media-posts', channelId]);

      queryClient.setQueryData<MediaPost[]>(['media-posts', channelId], (old) =>
        (old ?? []).map((p) =>
          p.id === variables.postId
            ? {
                ...p,
                ...(variables.is_pinned !== undefined ? { is_pinned: variables.is_pinned } : {}),
                ...(variables.is_locked !== undefined ? { is_locked: variables.is_locked } : {}),
                ...(variables.archived !== undefined ? { archived: variables.archived } : {}),
              }
            : p,
        ),
      );

      return { previous };
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['media-posts', channelId], context.previous);
      }
      toast.error(error?.message ?? 'Action impossible');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['media-posts', channelId] });
    },
  });
}