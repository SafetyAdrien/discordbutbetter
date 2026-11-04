import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { refreshSignedUrls } from '@/lib/storageUrls';
import { uploadAttachments } from '@/hooks/useMessages';
import type { PendingAttachment } from '@/hooks/usePendingAttachments';
import type { StoredAttachment } from '@/components/chat/MessageAttachments';

/*
 * Posts d'un salon Forum ou Multimedia. Comme sur Discord, un post est un fil
 * (`threads`) du salon : son premier message (`starter_message_id`) porte le
 * texte et les medias du post, les reponses sont les messages du fil. La
 * creation passe par la RPC create_forum_post (fil + message d'ouverture +
 * abonnement en une transaction, tags et mode lent verifies cote serveur).
 */

export interface ForumThreadAuthor {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

export interface ForumThreadStarter {
  id: string;
  content: string;
  attachments: StoredAttachment[];
  created_at: string;
  author: ForumThreadAuthor | null;
}

export interface ForumThread {
  id: string;
  channel_id: string;
  name: string;
  created_by: string;
  created_at: string;
  last_message_at: string | null;
  archived: boolean;
  locked: boolean;
  pinned: boolean;
  applied_tags: string[];
  message_count: number;
  thumbnail_url: string | null;
  spoiler: boolean;
  slowmode_seconds: number;
  auto_archive_minutes: number | null;
  starter_message_id: string | null;
  starter: ForumThreadStarter | null;
}

// Colonnes et RPC ajoutees apres la generation des types Supabase.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const THREAD_COLUMNS =
  'id, channel_id, name, created_by, created_at, last_message_at, archived, locked, pinned, applied_tags, message_count, thumbnail_url, spoiler, slowmode_seconds, auto_archive_minutes, starter_message_id';

export const forumThreadsKey = (channelId: string) => ['forum-threads', channelId] as const;

/** Reponses d'un post (le message d'ouverture n'en est pas une). */
export const replyCount = (t: Pick<ForumThread, 'message_count'>) => Math.max(0, t.message_count - 1);

/** Medias affichables d'un post : vignette choisie, sinon ses images / videos. */
export function postMedia(t: ForumThread): StoredAttachment[] {
  const media = (t.starter?.attachments ?? []).filter((a) => a.type === 'image' || a.type === 'video' || a.type === 'gif');
  return media;
}

export function useForumThreads(channelId: string) {
  const queryClient = useQueryClient();
  const instanceId = useRef(Math.random().toString(36).slice(2));

  const query = useQuery({
    queryKey: forumThreadsKey(channelId),
    enabled: !!channelId,
    queryFn: async (): Promise<ForumThread[]> => {
      const { data, error } = await db.from('threads')
        .select(THREAD_COLUMNS)
        .eq('channel_id', channelId)
        .order('pinned', { ascending: false })
        .order('last_message_at', { ascending: false, nullsFirst: false });
      if (error) throw error;
      const threads = (data ?? []) as Omit<ForumThread, 'starter'>[];
      const starterIds = threads.map((t) => t.starter_message_id).filter(Boolean) as string[];
      let starters = new Map<string, ForumThreadStarter>();
      if (starterIds.length) {
        const { data: msgs, error: mErr } = await supabase
          .from('thread_messages')
          .select('id, content, attachments, created_at, author:profiles!thread_messages_author_id_fkey(id, username, display_name, avatar_url)')
          .in('id', starterIds);
        if (mErr) throw mErr;
        const refreshed = await refreshSignedUrls(msgs ?? []);
        starters = new Map(
          (refreshed as unknown as ForumThreadStarter[]).map((m) => [m.id, { ...m, attachments: Array.isArray(m.attachments) ? m.attachments : [] }]),
        );
      }
      return threads.map((t) => ({
        ...t,
        applied_tags: t.applied_tags ?? [],
        starter: t.starter_message_id ? starters.get(t.starter_message_id) ?? null : null,
      }));
    },
  });

  useEffect(() => {
    if (!channelId) return;
    const ch = supabase
      .channel(`forum-threads:${channelId}-${instanceId.current}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'threads', filter: `channel_id=eq.${channelId}` }, () =>
        queryClient.invalidateQueries({ queryKey: forumThreadsKey(channelId) }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [channelId, queryClient]);

  return query;
}

/** Fils suivis par l'utilisateur parmi `threadIds` ("Abonne(e)"). */
export function useFollowedThreadIds(threadIds: string[]) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['thread-follow-set', user?.id, threadIds.join(',')],
    enabled: !!user && threadIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from('thread_followers').select('thread_id').eq('user_id', user!.id).in('thread_id', threadIds);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.thread_id as string));
    },
  });
}

const POST_ERRORS: Record<string, string> = {
  TAG_REQUIRED: 'Un tag est requis pour créer un post dans ce salon.',
  MODERATED_TAG: 'Seuls les modérateurs peuvent appliquer ce tag.',
  TOO_MANY_TAGS: 'Tu peux appliquer 5 tags maximum.',
  SLOWMODE: 'Le mode lent est activé : patiente avant de publier un nouveau post.',
  MEDIA_REQUIRED: 'Ajoute au moins un média pour publier dans ce salon.',
  CONTENT_REQUIRED: 'Ajoute un message ou une pièce jointe.',
  INVALID_TITLE: 'Le titre doit faire entre 1 et 100 caractères.',
  FORBIDDEN: "Tu n'as pas la permission de publier ici.",
  THREAD_LOCKED: 'Ce post est verrouillé.',
};

export function forumErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err ?? '');
  const code = Object.keys(POST_ERRORS).find((k) => msg.includes(k));
  return code ? POST_ERRORS[code] : msg || 'Une erreur est survenue';
}

export interface CreateForumPostInput {
  title: string;
  content: string;
  attachments: PendingAttachment[];
  appliedTags: string[];
  /** Media : vignette du post (sinon le premier media sert de vignette). */
  thumbnail?: PendingAttachment | null;
}

export function useCreateForumPost(channelId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateForumPostInput) => {
      if (!user) throw new Error('Not authenticated');
      const stored = await uploadAttachments(user.id, input.attachments);
      let thumbnailUrl: string | null = null;
      if (input.thumbnail) {
        const [thumb] = await uploadAttachments(user.id, [input.thumbnail]);
        thumbnailUrl = thumb?.url ?? null;
      }
      const { data, error } = await db.rpc('create_forum_post', {
        _channel_id: channelId,
        _title: input.title,
        _content: input.content,
        _attachments: stored,
        _applied_tags: input.appliedTags,
        _thumbnail_url: thumbnailUrl,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: forumThreadsKey(channelId) }),
    onError: (err) => toast.error(forumErrorMessage(err)),
  });
}

export type ForumThreadPatch = Partial<Pick<ForumThread, 'name' | 'applied_tags' | 'pinned' | 'locked' | 'archived' | 'slowmode_seconds' | 'auto_archive_minutes' | 'spoiler'>>;

export function useUpdateForumThread(channelId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ threadId, patch }: { threadId: string; patch: ForumThreadPatch }) => {
      const body: Record<string, unknown> = { ...patch };
      if ('archived' in patch) body.archived_at = patch.archived ? new Date().toISOString() : null;
      const { error } = await db.from('threads').update(body).eq('id', threadId);
      if (error) throw error;
    },
    onMutate: async ({ threadId, patch }) => {
      await queryClient.cancelQueries({ queryKey: forumThreadsKey(channelId) });
      const prev = queryClient.getQueryData<ForumThread[]>(forumThreadsKey(channelId));
      queryClient.setQueryData<ForumThread[]>(forumThreadsKey(channelId), (old) => old?.map((t) => (t.id === threadId ? { ...t, ...patch } : t)));
      return { prev };
    },
    onError: (err, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(forumThreadsKey(channelId), ctx.prev);
      toast.error(forumErrorMessage(err));
    },
    onSettled: (_d, _e, { threadId }) => {
      queryClient.invalidateQueries({ queryKey: forumThreadsKey(channelId) });
      queryClient.invalidateQueries({ queryKey: ['thread', threadId] });
    },
  });
}

export function useDeleteForumThread(channelId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (threadId: string) => {
      const { error } = await supabase.from('threads').delete().eq('id', threadId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: forumThreadsKey(channelId) });
      toast.success('Post supprimé');
    },
    onError: (err) => toast.error(forumErrorMessage(err)),
  });
}
