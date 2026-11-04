import { useState } from 'react';
import type { ForumThread } from '@/hooks/useForumThreads';
import { DeleteForumPostDialog } from './ForumPostMenu';

/** Etat local de la confirmation de suppression, partage par la liste et le panneau. */
export function useDeletePostConfirm(onConfirm: (post: ForumThread) => void) {
  const [target, setTarget] = useState<ForumThread | null>(null);
  return {
    ask: (post: ForumThread) => setTarget(post),
    dialog: (
      <DeleteForumPostDialog
        post={target}
        open={!!target}
        onOpenChange={(o) => !o && setTarget(null)}
        onConfirm={() => {
          if (target) onConfirm(target);
          setTarget(null);
        }}
      />
    ),
  };
}
