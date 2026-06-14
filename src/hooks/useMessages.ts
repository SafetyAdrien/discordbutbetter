import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
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
  type: 'image' | 'video' | 'file';
  size: number;
  description?: string;
  isSpoiler?: boolean;
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

export function useMessages(channelId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const cacheReady = useCacheReady();

  const query = useQuery({
    queryKey: ['messages', channelId],
    placeholderData: () => (channelId ? cacheGetSync<MessageWithAuthor[]>(`messages:${channelId}`) : undefined),
    queryFn: () => timeAsync(`query:messages(${channelId ?? 'none'})`, async (): Promise<MessageWithAuthor[]> => {
      if (!channelId) return [];

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
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;

      const baseMessages: MessageWithAuthor[] = (data as any[]).map((msg) => ({
        ...msg,
        attachments: Array.isArray(msg.attachments) ? msg.attachments : [],
      })) as MessageWithAuthor[];

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
    }),
    enabled: !!channelId && !!user && cacheReady,
    staleTime: 0,
    refetchOnMount: 'always',
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
      .channel(`messages:${channelId}`)
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, user, queryClient]);

  return query;
}

// Helper function to upload attachments
async function uploadAttachments(
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

    const { data: urlData } = supabase.storage
      .from('message-attachments')
      .getPublicUrl(data.path);

    // Determine type based on MIME
    let type: 'image' | 'video' | 'file' = 'file';
    if (attachment.file.type.startsWith('image/')) type = 'image';
    else if (attachment.file.type.startsWith('video/')) type = 'video';

    uploadedAttachments.push({
      id: attachment.id,
      url: urlData.publicUrl,
      name: attachment.name || attachment.file.name,
      type,
      size: attachment.file.size,
      description: attachment.description || undefined,
      isSpoiler: attachment.isSpoiler,
    });
  }

  return uploadedAttachments;
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
    }: {
      channelId: string;
      content: string;
      attachments?: PendingAttachment[];
      replyToId?: string | null;
    }) => {
      if (!user) throw new Error('Not authenticated');

      // Validate - must have content or attachments
      const validated = messageSchema.parse({ content });
      if (!validated.content.trim() && attachments.length === 0) {
        throw new Error('Message must have content or attachments');
      }

      // Upload attachments first
      let uploadedAttachments: StoredAttachment[] = [];
      if (attachments.length > 0) {
        uploadedAttachments = await uploadAttachments(user.id, attachments);
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
    onMutate: async ({ channelId, content, attachments = [], replyToId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['messages', channelId] });

      // Snapshot previous value
      const previousMessages = queryClient.getQueryData<MessageWithAuthor[]>([
        'messages',
        channelId,
      ]);

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
        id: `temp-${Date.now()}`,
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
      toast.success('Message modifié');
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
      toast.success('Message supprimé');
    },
  });
}
