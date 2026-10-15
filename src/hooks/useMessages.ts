import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cacheGetSync, cacheSetAsync } from '@/lib/cache';
import { timeAsync } from '@/lib/perf';
import { useCacheReady } from '@/hooks/useCacheReady';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { z } from 'zod';
import { PendingAttachment } from '@/hooks/usePendingAttachments';

// Message validation schema - allows empty content if there are attachments
const messageSchema = z.object({
  content: z.string()
    .trim()
    .max(2000, 'Message too long (max 2000 characters)'),
});

export interface StoredAttachment {
  id: string;
  url: string;
  name: string;
  type: 'image' | 'video' | 'file' | 'sticker' | 'gif';
  size: number;
  description?: string;
  isSpoiler?: boolean;
}

export interface ExternalAttachment {
  url: string;
  name: string;
  type: 'sticker' | 'gif';
}

export interface RepliedMessageSnapshot {
  id: string;
  content: string;
  attachments: StoredAttachment[];
  deleted?: boolean;
  author: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
}

export interface MessageWithAuthor {
  id: string;
  content: string;
  created_at: string | null;
  edited_at: string | null;
  attachments: StoredAttachment[];
  channel_id: string;
  source_server_id?: string | null;
  source_server_name?: string | null;
  source_server_icon?: string | null;
  source_channel_name?: string | null;
  is_published_message?: boolean | null;
  publish_dismissed?: boolean | null;
  is_system?: boolean;
  reply_to_id?: string | null;
  repliedMessage?: RepliedMessageSnapshot | null;
  author: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    status: 'online' | 'idle' | 'dnd' | 'offline' | null;
    custom_status: string | null;
  } | null;
  isPending?: boolean;
}

// Shared between useMessages' queryFn and the sidebar hover-prefetch so both
// populate the exact same ['messages', channelId] cache entry identically.
export function fetchChannelMessages(channelId: string): Promise<MessageWithAuthor[]> {
  return timeAsync(`query:messages(${channelId})`, async (): Promise<MessageWithAuthor[]> => {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        id,
        content,
        created_at,
        edited_at,
        attachments,
        channel_id,
        reply_to_id,
        source_server_id,
        source_server_name,
        source_server_icon,
        source_channel_name,
        is_published_message,
        publish_dismissed,
        is_system,
        author:profiles!messages_author_id_fkey (
          id,
          username,
          display_name,
          avatar_url,
          status,
          custom_status
        )
      `)
      .eq('channel_id', channelId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    // Fetched newest-first for fast initial paint; reverse to chronological order for the UI.
    const baseMessages: MessageWithAuthor[] = (data as any[])
      .map((msg) => ({
        ...msg,
        attachments: Array.isArray(msg.attachments) ? msg.attachments : [],
      }))
      .reverse() as MessageWithAuthor[];

    // Resolve replied messages in a single batched query
    const replyIds = Array.from(
      new Set(baseMessages.map((m) => m.reply_to_id).filter(Boolean) as string[])
    );

    let replyMap = new Map<string, RepliedMessageSnapshot>();
    if (replyIds.length > 0) {
      const { data: replyData } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          attachments,
          author:profiles!messages_author_id_fkey (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .in('id', replyIds);

      if (replyData) {
        for (const r of replyData as any[]) {
          replyMap.set(r.id, {
            id: r.id,
            content: r.content || '',
            attachments: Array.isArray(r.attachments) ? r.attachments : [],
            author: r.author
              ? {
                  id: r.author.id,
                  username: r.author.username,
                  display_name: r.author.display_name,
                  avatar_url: r.author.avatar_url,
                }
              : null,
          });
        }
      }
    }

    return baseMessages.map((m) => {
      if (!m.reply_to_id) return m;
      const snap = replyMap.get(m.reply_to_id);
      return {
        ...m,
        repliedMessage: snap ?? {
          id: m.reply_to_id,
          content: '',
          attachments: [],
          deleted: true,
          author: null,
        },
      };
    });
  });
}

export function useMessages(channelId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const instanceIdRef = useRef(Math.random().toString(36).slice(2));

  const query = useQuery({
    queryKey: ['messages', channelId],
    placeholderData: () => (channelId ? cacheGetSync<MessageWithAuthor[]>(`messages:${channelId}`) : undefined),
    queryFn: () => (channelId ? fetchChannelMessages(channelId) : Promise.resolve([])),
    enabled: !!channelId && !!user,
    staleTime: 30_000,
    refetchOnMount: (q) => (q.state.data ? false : 'always'),
    refetchOnWindowFocus: false,
  });

  // Persist to IndexedDB
  useEffect(() => {
    if (query.data && channelId && !query.isPlaceholderData) {
      cacheSetAsync(`messages:${channelId}`, query.data);
    }
  }, [query.data, channelId, query.isPlaceholderData]);

  // Real-time subscription for new messages
  useEffect(() => {
    if (!channelId || !user) return;

    const channel = supabase
      .channel(`messages:${channelId}-${instanceIdRef.current}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload) => {
          // Don't add if this is our own message (already added optimistically)
          const newMsg = payload.new as any;
          if (newMsg.author_id === user.id) return;

          // Fetch the complete message with author
          const { data } = await supabase
            .from('messages')
            .select(`
              id,
              content,
              created_at,
              edited_at,
              attachments,
              channel_id,
              is_system,
              reply_to_id,
              author:profiles!messages_author_id_fkey (
                id,
                username,
                display_name,
                avatar_url,
                status,
                custom_status
              )
            `)
            .eq('id', newMsg.id)
            .single();

          if (data) {
            // Resolve replied message snapshot if needed
            let repliedMessage: RepliedMessageSnapshot | null = null;
            if ((data as any).reply_to_id) {
              const { data: replyData } = await supabase
                .from('messages')
                .select(`
                  id, content, attachments,
                  author:profiles!messages_author_id_fkey (
                    id, username, display_name, avatar_url
                  )
                `)
                .eq('id', (data as any).reply_to_id)
                .maybeSingle();
              if (replyData) {
                const r = replyData as any;
                repliedMessage = {
                  id: r.id,
                  content: r.content || '',
                  attachments: Array.isArray(r.attachments) ? r.attachments : [],
                  author: r.author
                    ? {
                        id: r.author.id,
                        username: r.author.username,
                        display_name: r.author.display_name,
                        avatar_url: r.author.avatar_url,
                      }
                    : null,
                };
              } else {
                repliedMessage = {
                  id: (data as any).reply_to_id,
                  content: '',
                  attachments: [],
                  deleted: true,
                  author: null,
                };
              }
            }

            const parsedData: MessageWithAuthor = {
              ...(data as any),
              attachments: Array.isArray((data as any).attachments) ? (data as any).attachments : [],
              repliedMessage,
            };
            queryClient.setQueryData(
              ['messages', channelId],
              (old: MessageWithAuthor[] | undefined) => {
                if (!old) return [parsedData];
                if (old.some((m) => m.id === parsedData.id)) return old;
                return [...old, parsedData];
              }
            );
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          const updated = payload.new as any;
          queryClient.setQueryData(
            ['messages', channelId],
            (old: MessageWithAuthor[] | undefined) => {
              if (!old) return old;
              return old.map((m) =>
                m.id === updated.id
                  ? { ...m, content: updated.content, edited_at: updated.edited_at }
                  : m
              );
            }
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          const deleted = payload.old as any;
          queryClient.setQueryData(
            ['messages', channelId],
            (old: MessageWithAuthor[] | undefined) => {
              if (!old) return old;
              return old.filter((m) => m.id !== deleted.id);
            }
          );
        }
      )
      .subscribe((status) => {
        // Race recovery: once Realtime is live, refetch to catch any INSERT
        // that landed between the initial fetch and the subscription ack.
        if (status === 'SUBSCRIBED') {
          queryClient.invalidateQueries({ queryKey: ['messages', channelId] });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, user, queryClient]);

  // ── Infinite scroll: load older messages on demand ───────────────────────
  const [hasMoreOlder, setHasMoreOlder] = useState(true);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);

  useEffect(() => {
    setHasMoreOlder(true);
    setIsLoadingOlder(false);
  }, [channelId]);

  const loadOlder = useCallback(async (): Promise<number> => {
    if (!channelId || !user) return 0;
    if (isLoadingOlder || !hasMoreOlder) return 0;
    const current = queryClient.getQueryData<MessageWithAuthor[]>(['messages', channelId]) || [];
    if (current.length === 0) return 0;
    const oldest = current[0];
    if (!oldest?.created_at) return 0;
    setIsLoadingOlder(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id, content, created_at, edited_at, attachments, channel_id,
          reply_to_id, source_server_id, source_server_name, source_server_icon,
          source_channel_name, is_published_message, publish_dismissed, is_system,
          author:profiles!messages_author_id_fkey (
            id, username, display_name, avatar_url, status, custom_status
          )
        `)
        .eq('channel_id', channelId)
        // Composite keyset cursor on (created_at, id). Ordering by created_at
        // alone is not a total order: rows sharing a timestamp can be skipped
        // or re-fetched forever, because `< created_at` never moves past them.
        .or(`created_at.lt.${oldest.created_at},and(created_at.eq.${oldest.created_at},id.lt.${oldest.id})`)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(50);
      if (error) throw error;

      const older: MessageWithAuthor[] = (data as any[])
        .map((m) => ({ ...m, attachments: Array.isArray(m.attachments) ? m.attachments : [] }))
        .reverse() as MessageWithAuthor[];

      // Resolve replies for older batch
      const replyIds = Array.from(new Set(older.map((m) => m.reply_to_id).filter(Boolean) as string[]));
      const replyMap = new Map<string, RepliedMessageSnapshot>();
      if (replyIds.length > 0) {
        const { data: replyData } = await supabase
          .from('messages')
          .select(`
            id, content, attachments,
            author:profiles!messages_author_id_fkey (id, username, display_name, avatar_url)
          `)
          .in('id', replyIds);
        if (replyData) {
          for (const r of replyData as any[]) {
            replyMap.set(r.id, {
              id: r.id,
              content: r.content || '',
              attachments: Array.isArray(r.attachments) ? r.attachments : [],
              author: r.author
                ? { id: r.author.id, username: r.author.username, display_name: r.author.display_name, avatar_url: r.author.avatar_url }
                : null,
            });
          }
        }
      }

      const resolved = older.map((m) => {
        if (!m.reply_to_id) return m;
        const snap = replyMap.get(m.reply_to_id);
        return {
          ...m,
          repliedMessage: snap ?? { id: m.reply_to_id, content: '', attachments: [], deleted: true, author: null },
        };
      });

      if (resolved.length < 50) setHasMoreOlder(false);

      if (resolved.length > 0) {
        queryClient.setQueryData<MessageWithAuthor[]>(['messages', channelId], (old) => {
          const existing = old || [];
          const existingIds = new Set(existing.map((m) => m.id));
          const fresh = resolved.filter((m) => !existingIds.has(m.id));
          return [...fresh, ...existing];
        });
      }

      return resolved.length;
    } catch (e) {
      console.error('[useMessages] loadOlder failed', e);
      return 0;
    } finally {
      setIsLoadingOlder(false);
    }
  }, [channelId, user, queryClient, hasMoreOlder, isLoadingOlder]);

  return Object.assign(query, { loadOlder, hasMoreOlder, isLoadingOlder });
}

// Upload one attachment and return its stored descriptor.
async function uploadOne(
  userId: string,
  attachment: PendingAttachment,
): Promise<StoredAttachment> {
  const fileExt = attachment.file.name.split('.').pop();
  const fileName = `${userId}/${crypto.randomUUID()}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from('message-attachments')
    .upload(fileName, attachment.file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    // Previously this `continue`d, so the message was sent silently without
    // the attachment and the user was never told. Fail loudly instead.
    console.error('Upload error:', error);
    throw new Error(`Échec de l'envoi de « ${attachment.name || attachment.file.name} »`);
  }

  const { data: urlData, error: signErr } = await supabase.storage
    .from('message-attachments')
    // Signed URLs were minted with a 1-year TTL and stored inside the message
    // row, so a ban or a channel-permission change could not revoke access.
    // 7 days keeps the flow working while staying revocable.
    .createSignedUrl(data.path, 60 * 60 * 24 * 7);
  if (signErr || !urlData) {
    console.error('Sign URL error:', signErr);
    throw new Error(`Échec de la génération du lien pour « ${attachment.name || attachment.file.name} »`);
  }

  // Determine type based on MIME
  let type: 'image' | 'video' | 'file' = 'file';
  if (attachment.file.type.startsWith('image/')) type = 'image';
  else if (attachment.file.type.startsWith('video/')) type = 'video';

  return {
    id: attachment.id,
    url: urlData.signedUrl,
    name: attachment.name || attachment.file.name,
    type,
    size: attachment.file.size,
    description: attachment.description || undefined,
    isSpoiler: attachment.isSpoiler,
  };
}

/** Cap on concurrent uploads, to avoid saturating a mobile connection. */
const MAX_PARALLEL_UPLOADS = 3;

/**
 * Upload every attachment, with bounded concurrency.
 *
 * This used to `await` each file in a for-loop, so the total time was the SUM
 * of every upload plus every signed-URL call: sending 5 photos took 5x as long
 * as sending one. Uploads are now issued in parallel (bounded to 3 so we don't
 * saturate the connection), turning that sum into a small fraction.
 *
 * Original ordering is preserved, and the first failure rejects the whole batch
 * so the user is told rather than silently losing an attachment.
 */
async function uploadAttachments(
  userId: string,
  pendingAttachments: PendingAttachment[],
): Promise<StoredAttachment[]> {
  if (pendingAttachments.length === 0) return [];
  if (pendingAttachments.length === 1) {
    return [await uploadOne(userId, pendingAttachments[0])];
  }

  const results = new Array<StoredAttachment>(pendingAttachments.length);
  let nextIndex = 0;

  const worker = async () => {
    while (nextIndex < pendingAttachments.length) {
      const index = nextIndex++;
      // `uploadOne` writes only into its own slot, so ordering is stable.
      results[index] = await uploadOne(userId, pendingAttachments[index]);
    }
  };

  const workers = Array.from(
    { length: Math.min(MAX_PARALLEL_UPLOADS, pendingAttachments.length) },
    () => worker(),
  );

  // Promise.all rejects on the first failure; the remaining workers keep
  // running but their results are discarded, which is what we want.
  await Promise.all(workers);

  return results;
}

export function useSendMessage() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      channelId,
      content,
      attachments = [],
      replyToId,
      externalAttachment,
    }: {
      channelId: string;
      content: string;
      attachments?: PendingAttachment[];
      replyToId?: string | null;
      externalAttachment?: ExternalAttachment;
    }) => {
      if (!user) throw new Error('Not authenticated');

      // Validate - must have content or attachments
      const validated = messageSchema.parse({ content });
      if (!validated.content.trim() && attachments.length === 0 && !externalAttachment) {
        throw new Error('Message must have content or attachments');
      }

      // Upload attachments first
      let uploadedAttachments: StoredAttachment[] = [];
      if (attachments.length > 0) {
        uploadedAttachments = await uploadAttachments(user.id, attachments);
      }
      if (externalAttachment) {
        uploadedAttachments = [
          ...uploadedAttachments,
          {
            id: crypto.randomUUID(),
            url: externalAttachment.url,
            name: externalAttachment.name,
            type: externalAttachment.type,
            size: 0,
          },
        ];
      }

      const insertPayload: any = {
        channel_id: channelId,
        content: validated.content,
        author_id: user.id,
        attachments: uploadedAttachments.length > 0 ? (uploadedAttachments as unknown as any) : [],
      };
      if (replyToId) insertPayload.reply_to_id = replyToId;

      const { data, error } = await supabase
        .from('messages')
        .insert(insertPayload)
        .select(`
          id,
          content,
          created_at,
          edited_at,
          attachments,
          channel_id,
          reply_to_id,
          author:profiles!messages_author_id_fkey (
            id,
            username,
            display_name,
            avatar_url,
            status,
            custom_status
          )
        `)
        .single();

      if (error) throw error;

      // Resolve replied snapshot for the inserted message
      let repliedMessage: RepliedMessageSnapshot | null = null;
      if (replyToId) {
        const { data: replyData } = await supabase
          .from('messages')
          .select(`
            id, content, attachments,
            author:profiles!messages_author_id_fkey (
              id, username, display_name, avatar_url
            )
          `)
          .eq('id', replyToId)
          .maybeSingle();
        if (replyData) {
          const r = replyData as any;
          repliedMessage = {
            id: r.id,
            content: r.content || '',
            attachments: Array.isArray(r.attachments) ? r.attachments : [],
            author: r.author
              ? {
                  id: r.author.id,
                  username: r.author.username,
                  display_name: r.author.display_name,
                  avatar_url: r.author.avatar_url,
                }
              : null,
          };
        } else {
          repliedMessage = {
            id: replyToId,
            content: '',
            attachments: [],
            deleted: true,
            author: null,
          };
        }
      }

      return {
        ...data,
        attachments: (Array.isArray(data.attachments) ? data.attachments : []) as unknown as StoredAttachment[],
        repliedMessage,
      } as MessageWithAuthor;
    },
    onMutate: async ({ channelId, content, attachments = [], replyToId, externalAttachment }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['messages', channelId] });

      // Snapshot previous value.
      // Defaults to [] rather than undefined: `getQueryData` returns undefined
      // on a cold cache, and the old `if (context?.previousMessages)` guard
      // then skipped the rollback entirely, leaving the optimistic message
      // stuck in the list forever.
      const previousMessages = queryClient.getQueryData<MessageWithAuthor[]>([
        'messages',
        channelId,
      ]) ?? [];

      // Create optimistic attachments
      const optimisticAttachments: StoredAttachment[] = attachments.map(a => ({
        id: a.id,
        url: a.previewUrl,
        name: a.name,
        type: a.file.type.startsWith('image/') ? 'image' :
              a.file.type.startsWith('video/') ? 'video' : 'file',
        size: a.file.size,
        description: a.description || undefined,
        isSpoiler: a.isSpoiler,
      }));
      if (externalAttachment) {
        optimisticAttachments.push({
          id: `temp-ext-${Date.now()}`,
          url: externalAttachment.url,
          name: externalAttachment.name,
          type: externalAttachment.type,
          size: 0,
        });
      }

      // Optimistic replied snapshot from cache
      let optimisticReplied: RepliedMessageSnapshot | null = null;
      if (replyToId && previousMessages) {
        const src = previousMessages.find((m) => m.id === replyToId);
        if (src) {
          optimisticReplied = {
            id: src.id,
            content: src.content || '',
            attachments: src.attachments || [],
            author: src.author
              ? {
                  id: src.author.id,
                  username: src.author.username,
                  display_name: src.author.display_name,
                  avatar_url: src.author.avatar_url,
                }
              : null,
          };
        }
      }

      // Optimistically add the message
      const optimisticMessage: MessageWithAuthor = {
        id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        content,
        created_at: new Date().toISOString(),
        edited_at: null,
        attachments: optimisticAttachments,
        channel_id: channelId,
        reply_to_id: replyToId ?? null,
        repliedMessage: optimisticReplied,
        author: profile
          ? {
              id: profile.id,
              username: profile.username,
              display_name: profile.display_name,
              avatar_url: profile.avatar_url,
              status: profile.status,
              custom_status: profile.custom_status,
            }
          : null,
        isPending: true,
      };

      queryClient.setQueryData<MessageWithAuthor[]>(
        ['messages', channelId],
        (old) => [...(old || []), optimisticMessage]
      );

      return { previousMessages, optimisticMessage };
    },
    onSuccess: (data, { channelId }, context) => {
      // Replace optimistic message with real one
      queryClient.setQueryData<MessageWithAuthor[]>(
        ['messages', channelId],
        (old) => {
          if (!old) return [data as MessageWithAuthor];
          return old.map((m) =>
            m.id === context?.optimisticMessage.id ? (data as MessageWithAuthor) : m
          );
        }
      );
    },
    onError: (error, { channelId }, context) => {
      // Rollback on error
      if (context?.previousMessages) {
        queryClient.setQueryData(
          ['messages', channelId],
          context.previousMessages
        );
      }
      toast.error("Erreur lors de l'envoi du message");
      console.error('Send message error:', error);
    },
  });
}

export function useEditMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      messageId,
      channelId,
      content,
    }: {
      messageId: string;
      channelId: string;
      content: string;
    }) => {
      const validated = messageSchema.parse({ content });
      const { data, error } = await supabase
        .from('messages')
        .update({ content: validated.content, edited_at: new Date().toISOString() })
        .eq('id', messageId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ messageId, channelId, content }) => {
      await queryClient.cancelQueries({ queryKey: ['messages', channelId] });

      const previousMessages = queryClient.getQueryData<MessageWithAuthor[]>([
        'messages',
        channelId,
      ]);

      queryClient.setQueryData<MessageWithAuthor[]>(
        ['messages', channelId],
        (old) => {
          if (!old) return old;
          return old.map((m) =>
            m.id === messageId
              ? { ...m, content, edited_at: new Date().toISOString() }
              : m
          );
        }
      );

      return { previousMessages };
    },
    onError: (error, { channelId }, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(['messages', channelId], context.previousMessages);
      }
      toast.error('Erreur lors de la modification');
      console.error('Edit message error:', error);
    },
    onSuccess: () => {
    },
  });
}

export function useDeleteMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      messageId,
      channelId,
    }: {
      messageId: string;
      channelId: string;
    }) => {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;
      return { messageId, channelId };
    },
    onMutate: async ({ messageId, channelId }) => {
      await queryClient.cancelQueries({ queryKey: ['messages', channelId] });

      const previousMessages = queryClient.getQueryData<MessageWithAuthor[]>([
        'messages',
        channelId,
      ]);

      queryClient.setQueryData<MessageWithAuthor[]>(
        ['messages', channelId],
        (old) => {
          if (!old) return old;
          return old.filter((m) => m.id !== messageId);
        }
      );

      return { previousMessages };
    },
    onError: (error, { channelId }, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(['messages', channelId], context.previousMessages);
      }
      toast.error('Erreur lors de la suppression');
      console.error('Delete message error:', error);
    },
    onSuccess: () => {
    },
  });
}
