import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cacheGetSync, cacheSetAsync } from '@/lib/cache';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { z } from 'zod';
import { PendingAttachment } from '@/hooks/usePendingAttachments';

// Message validation schema
const messageSchema = z.object({
  content: z.string()
    .trim()
    .max(2000, 'Message too long (max 2000 characters)'),
});

export interface StoredAttachment {
  id: string;
  url: string;
  name: string;
  type: 'image' | 'video' | 'file';
  size: number;
  description?: string;
  isSpoiler?: boolean;
}

export interface RepliedDMSnapshot {
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

export interface DMMessage {
  id: string;
  content: string;
  created_at: string | null;
  edited_at: string | null;
  attachments: StoredAttachment[];
  conversation_id: string;
  reply_to_id?: string | null;
  repliedMessage?: RepliedDMSnapshot | null;
  author: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
  isPending?: boolean;
}

// Helper to scope cache keys per user — avoids cross-account bleed if a user
// signs out/in without a full reload.
const dmKey = (userId: string | undefined | null, conversationId: string | null) =>
  ['dm-messages', userId ?? 'anon', conversationId ?? 'none'] as const;
const dmIdbKey = (userId: string, conversationId: string) =>
  `dm-messages:${userId}:${conversationId}`;

export function useDMMessages(conversationId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const queryKey = dmKey(userId, conversationId);

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<DMMessage[]> => {
      if (!conversationId) return [];

      // Fetch the 50 MOST RECENT messages (desc + reverse), not the oldest 50.
      const { data, error } = await supabase
        .from('dm_messages')
        .select(`
          id,
          content,
          created_at,
          edited_at,
          attachments,
          conversation_id,
          reply_to_id,
          author:profiles!dm_messages_author_id_fkey (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const baseMessages: DMMessage[] = (data as any[])
        .map((msg) => ({
          ...msg,
          attachments: Array.isArray(msg.attachments) ? msg.attachments : [],
        }))
        .reverse() as DMMessage[];

      // Resolve replied messages in a single batched query
      const replyIds = Array.from(
        new Set(baseMessages.map((m) => m.reply_to_id).filter(Boolean) as string[])
      );

      const replyMap = new Map<string, RepliedDMSnapshot>();
      if (replyIds.length > 0) {
        const { data: replyData } = await supabase
          .from('dm_messages')
          .select(`
            id,
            content,
            attachments,
            author:profiles!dm_messages_author_id_fkey (
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

      return baseMessages.map((m) => ({
        ...m,
        repliedMessage: m.reply_to_id
          ? replyMap.get(m.reply_to_id) ?? {
              id: m.reply_to_id,
              content: '',
              attachments: [],
              deleted: true,
              author: null,
            }
          : null,
      }));
    },
    enabled: !!conversationId && !!user,
    placeholderData: () =>
      userId && conversationId ? cacheGetSync(dmIdbKey(userId, conversationId)) : undefined,
    staleTime: 30_000,
    refetchOnMount: (q) => (q.state.data ? false : 'always'),
    refetchOnWindowFocus: false,
  });

  // Persist to IndexedDB (scoped per user)
  useEffect(() => {
    if (query.data && conversationId && userId && !query.isPlaceholderData) {
      cacheSetAsync(dmIdbKey(userId, conversationId), query.data);
    }
  }, [query.data, conversationId, userId, query.isPlaceholderData]);

  // Real-time subscription
  useEffect(() => {
    if (!conversationId || !user) return;

    const channel = supabase
      .channel(`dm-messages:${conversationId}`, { config: { private: true } })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'dm_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const newMsg = payload.new as any;
          if (newMsg.author_id === user.id) return;

          // Fetch complete message with author
          const { data } = await supabase
            .from('dm_messages')
            .select(`
              id,
              content,
              created_at,
              edited_at,
              attachments,
              conversation_id,
              reply_to_id,
              author:profiles!dm_messages_author_id_fkey (
                id,
                username,
                display_name,
                avatar_url
              )
            `)
            .eq('id', newMsg.id)
            .single();

          if (data) {
            // Resolve replied snapshot if applicable
            let repliedMessage: RepliedDMSnapshot | null = null;
            if ((data as any).reply_to_id) {
              const { data: r } = await supabase
                .from('dm_messages')
                .select(`
                  id,
                  content,
                  attachments,
                  author:profiles!dm_messages_author_id_fkey (
                    id, username, display_name, avatar_url
                  )
                `)
                .eq('id', (data as any).reply_to_id)
                .maybeSingle();
              if (r) {
                repliedMessage = {
                  id: r.id,
                  content: r.content || '',
                  attachments: Array.isArray(r.attachments) ? (r.attachments as any) : [],
                  author: r.author
                    ? {
                        id: (r.author as any).id,
                        username: (r.author as any).username,
                        display_name: (r.author as any).display_name,
                        avatar_url: (r.author as any).avatar_url,
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

            const parsedData: DMMessage = {
              ...(data as any),
              attachments: (Array.isArray((data as any).attachments)
                ? (data as any).attachments
                : []) as unknown as StoredAttachment[],
              repliedMessage,
            };
            queryClient.setQueryData<DMMessage[]>(queryKey, (old) => {
              if (!old) return [parsedData];
              if (old.some((m) => m.id === parsedData.id)) return old;
              return [...old, parsedData];
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'dm_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updated = payload.new as any;
          queryClient.setQueryData<DMMessage[]>(queryKey, (old) => {
            if (!old) return old;
            return old.map((m) =>
              m.id === updated.id
                ? { ...m, content: updated.content, edited_at: updated.edited_at }
                : m
            );
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'dm_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const deleted = payload.old as any;
          queryClient.setQueryData<DMMessage[]>(queryKey, (old) => {
            if (!old) return old;
            return old.filter((m) => m.id !== deleted.id);
          });
        }
      )
      .subscribe((status) => {
        // Race condition fix: messages inserted between the initial fetch and
        // the Realtime SUBSCRIBED window are otherwise lost until manual refresh.
        // Invalidating once on SUBSCRIBED guarantees catch-up.
        if (status === 'SUBSCRIBED') {
          queryClient.invalidateQueries({ queryKey });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
    // queryKey is stable per (userId, conversationId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, user?.id, queryClient]);

  // ── Infinite scroll: load older messages on demand ───────────────────────
  const [hasMoreOlder, setHasMoreOlder] = useState(true);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);

  useEffect(() => {
    setHasMoreOlder(true);
    setIsLoadingOlder(false);
  }, [conversationId, userId]);

  const loadOlder = useCallback(async (): Promise<number> => {
    if (!conversationId || !user) return 0;
    if (isLoadingOlder || !hasMoreOlder) return 0;
    const current = queryClient.getQueryData<DMMessage[]>(queryKey) || [];
    if (current.length === 0) return 0;
    const oldest = current[0];
    if (!oldest?.created_at) return 0;
    setIsLoadingOlder(true);
    try {
      const { data, error } = await supabase
        .from('dm_messages')
        .select(`
          id, content, created_at, edited_at, attachments, conversation_id, reply_to_id,
          author:profiles!dm_messages_author_id_fkey (
            id, username, display_name, avatar_url
          )
        `)
        .eq('conversation_id', conversationId)
        .lt('created_at', oldest.created_at)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;

      const older: DMMessage[] = (data as any[])
        .map((m) => ({ ...m, attachments: Array.isArray(m.attachments) ? m.attachments : [] }))
        .reverse() as DMMessage[];

      const replyIds = Array.from(new Set(older.map((m) => m.reply_to_id).filter(Boolean) as string[]));
      const replyMap = new Map<string, RepliedDMSnapshot>();
      if (replyIds.length > 0) {
        const { data: replyData } = await supabase
          .from('dm_messages')
          .select(`
            id, content, attachments,
            author:profiles!dm_messages_author_id_fkey (id, username, display_name, avatar_url)
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
        queryClient.setQueryData<DMMessage[]>(queryKey, (old) => {
          const existing = old || [];
          const existingIds = new Set(existing.map((m) => m.id));
          const fresh = resolved.filter((m) => !existingIds.has(m.id));
          return [...fresh, ...existing];
        });
      }

      return resolved.length;
    } catch (e) {
      console.error('[useDMMessages] loadOlder failed', e);
      return 0;
    } finally {
      setIsLoadingOlder(false);
    }
  }, [conversationId, user, queryClient, hasMoreOlder, isLoadingOlder, queryKey]);

  return Object.assign(query, { loadOlder, hasMoreOlder, isLoadingOlder });
}

// Helper function to upload attachments
async function uploadDMAttachments(
  userId: string,
  pendingAttachments: PendingAttachment[]
): Promise<StoredAttachment[]> {
  const uploadedAttachments: StoredAttachment[] = [];

  for (const attachment of pendingAttachments) {
    const fileExt = attachment.file.name.split('.').pop();
    const fileName = `${userId}/${crypto.randomUUID()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('message-attachments')
      .upload(fileName, attachment.file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Upload error:', error);
      continue;
    }

    // Bucket is private; use a long-lived signed URL (1 year)
    const { data: urlData, error: signErr } = await supabase.storage
      .from('message-attachments')
      .createSignedUrl(data.path, 60 * 60 * 24 * 365);
    if (signErr || !urlData) {
      console.error('Sign URL error:', signErr);
      continue;
    }

    let type: 'image' | 'video' | 'file' = 'file';
    if (attachment.file.type.startsWith('image/')) type = 'image';
    else if (attachment.file.type.startsWith('video/')) type = 'video';

    uploadedAttachments.push({
      id: attachment.id,
      url: urlData.signedUrl,
      name: attachment.name || attachment.file.name,
      type,
      size: attachment.file.size,
      description: attachment.description || undefined,
      isSpoiler: attachment.isSpoiler,
    });
  }

  return uploadedAttachments;
}

export function useSendDMMessage() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      content,
      attachments = [],
      replyToId,
    }: {
      conversationId: string;
      content: string;
      attachments?: PendingAttachment[];
      replyToId?: string | null;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const validated = messageSchema.parse({ content });
      if (!validated.content.trim() && attachments.length === 0) {
        throw new Error('Message must have content or attachments');
      }

      let uploadedAttachments: StoredAttachment[] = [];
      if (attachments.length > 0) {
        uploadedAttachments = await uploadDMAttachments(user.id, attachments);
      }

      const { data, error } = await supabase
        .from('dm_messages')
        .insert({
          conversation_id: conversationId,
          content: validated.content,
          author_id: user.id,
          attachments: uploadedAttachments.length > 0 ? (uploadedAttachments as unknown as any) : [],
          reply_to_id: replyToId ?? null,
        })
        .select(`
          id,
          content,
          created_at,
          edited_at,
          attachments,
          conversation_id,
          reply_to_id,
          author:profiles!dm_messages_author_id_fkey (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;

      // Resolve replied snapshot from cache (the original message is in the same channel)
      let repliedMessage: RepliedDMSnapshot | null = null;
      if (replyToId) {
        const cached = queryClient.getQueryData<DMMessage[]>(dmKey(user.id, conversationId));
        const found = cached?.find((m) => m.id === replyToId);
        if (found && found.author) {
          repliedMessage = {
            id: found.id,
            content: found.content,
            attachments: found.attachments,
            author: {
              id: found.author.id,
              username: found.author.username,
              display_name: found.author.display_name,
              avatar_url: found.author.avatar_url,
            },
          };
        }
      }

      return {
        ...(data as any),
        attachments: (Array.isArray((data as any).attachments)
          ? (data as any).attachments
          : []) as unknown as StoredAttachment[],
        repliedMessage,
      } as DMMessage;
    },
    onMutate: async ({ conversationId, content, attachments = [], replyToId }) => {
      if (!user) return { previousMessages: undefined, optimisticMessage: undefined };
      const key = dmKey(user.id, conversationId);
      await queryClient.cancelQueries({ queryKey: key });

      const previousMessages = queryClient.getQueryData<DMMessage[]>(key);

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

      // Resolve replied snapshot optimistically from current cache
      let optimisticReplied: RepliedDMSnapshot | null = null;
      if (replyToId && previousMessages) {
        const found = previousMessages.find((m) => m.id === replyToId);
        if (found && found.author) {
          optimisticReplied = {
            id: found.id,
            content: found.content,
            attachments: found.attachments,
            author: {
              id: found.author.id,
              username: found.author.username,
              display_name: found.author.display_name,
              avatar_url: found.author.avatar_url,
            },
          };
        }
      }

      const optimisticMessage: DMMessage = {
        id: `temp-${Date.now()}`,
        content,
        created_at: new Date().toISOString(),
        edited_at: null,
        attachments: optimisticAttachments,
        conversation_id: conversationId,
        reply_to_id: replyToId ?? null,
        repliedMessage: optimisticReplied,
        author: profile ? {
          id: profile.id,
          username: profile.username,
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
        } : null,
        isPending: true,
      };

      queryClient.setQueryData<DMMessage[]>(key, (old) => [...(old || []), optimisticMessage]);

      return { previousMessages, optimisticMessage };
    },
    onSuccess: (data, { conversationId }, context) => {
      if (!user) return;
      const msgData = data as DMMessage;
      const key = dmKey(user.id, conversationId);
      queryClient.setQueryData<DMMessage[]>(key, (old) => {
        if (!old) return [msgData];
        return old.map((m) =>
          m.id === context?.optimisticMessage?.id ? msgData : m
        );
      });
      queryClient.invalidateQueries({ queryKey: ['dm-conversations'] });
    },
    onError: (_error, { conversationId }, context) => {
      if (user && context?.previousMessages) {
        queryClient.setQueryData(dmKey(user.id, conversationId), context.previousMessages);
      }
      toast.error("Erreur lors de l'envoi du message");
    },
  });
}

export function useEditDMMessage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      messageId,
      content,
    }: {
      messageId: string;
      conversationId: string;
      content: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const validated = messageSchema.parse({ content });

      const { data, error } = await supabase
        .from('dm_messages')
        .update({ content: validated.content, edited_at: new Date().toISOString() })
        .eq('id', messageId)
        .eq('author_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ messageId, conversationId, content }) => {
      if (!user) return { previousMessages: undefined };
      const key = dmKey(user.id, conversationId);
      await queryClient.cancelQueries({ queryKey: key });

      const previousMessages = queryClient.getQueryData<DMMessage[]>(key);

      queryClient.setQueryData<DMMessage[]>(
        key,
        (old) => old?.map((m) => (m.id === messageId ? { ...m, content, edited_at: new Date().toISOString() } : m)) || []
      );

      return { previousMessages };
    },
    onSuccess: () => {
      toast.success('Message modifié');
    },
    onError: (_error, { conversationId }, context) => {
      if (user && context?.previousMessages) {
        queryClient.setQueryData(dmKey(user.id, conversationId), context.previousMessages);
      }
      toast.error('Erreur lors de la modification');
    },
  });
}

export function useDeleteDMMessage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      messageId,
    }: {
      messageId: string;
      conversationId: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('dm_messages')
        .delete()
        .eq('id', messageId)
        .eq('author_id', user.id);

      if (error) throw error;
    },
    onMutate: async ({ messageId, conversationId }) => {
      if (!user) return { previousMessages: undefined };
      const key = dmKey(user.id, conversationId);
      await queryClient.cancelQueries({ queryKey: key });

      const previousMessages = queryClient.getQueryData<DMMessage[]>(key);

      queryClient.setQueryData<DMMessage[]>(
        key,
        (old) => old?.filter((m) => m.id !== messageId) || []
      );

      return { previousMessages };
    },
    onSuccess: () => {
      toast.success('Message supprimé');
    },
    onError: (_error, { conversationId }, context) => {
      if (user && context?.previousMessages) {
        queryClient.setQueryData(dmKey(user.id, conversationId), context.previousMessages);
      }
      toast.error('Erreur lors de la suppression');
    },
  });
}
