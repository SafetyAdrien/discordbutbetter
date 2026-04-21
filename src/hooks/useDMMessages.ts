import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
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

export function useDMMessages(conversationId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['dm-messages', conversationId],
    queryFn: async (): Promise<DMMessage[]> => {
      if (!conversationId) return [];

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
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;

      const baseMessages: DMMessage[] = (data as any[]).map((msg) => ({
        ...msg,
        attachments: Array.isArray(msg.attachments) ? msg.attachments : [],
      })) as DMMessage[];

      // Resolve replied messages in a single batched query
      const replyIds = Array.from(
        new Set(baseMessages.map((m) => m.reply_to_id).filter(Boolean) as string[])
      );

      let replyMap = new Map<string, RepliedDMSnapshot>();
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
    placeholderData: () => cacheGetSync(`dm-messages:${conversationId}`),
  });

  // Persist to IndexedDB
  useEffect(() => {
    if (query.data && conversationId && !query.isPlaceholderData) {
      cacheSetAsync(`dm-messages:${conversationId}`, query.data);
    }
  }, [query.data, conversationId, query.isPlaceholderData]);

  // Real-time subscription
  useEffect(() => {
    if (!conversationId || !user) return;

    const channel = supabase
      .channel(`dm-messages:${conversationId}`)
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
            queryClient.setQueryData<DMMessage[]>(
              ['dm-messages', conversationId],
              (old) => {
                if (!old) return [parsedData];
                if (old.some(m => m.id === parsedData.id)) return old;
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
          table: 'dm_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updated = payload.new as any;
          queryClient.setQueryData<DMMessage[]>(
            ['dm-messages', conversationId],
            (old) => {
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
          table: 'dm_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const deleted = payload.old as any;
          queryClient.setQueryData<DMMessage[]>(
            ['dm-messages', conversationId],
            (old) => {
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
  }, [conversationId, user, queryClient]);

  return query;
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

    const { data: urlData } = supabase.storage
      .from('message-attachments')
      .getPublicUrl(data.path);

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
        const cached = queryClient.getQueryData<DMMessage[]>(['dm-messages', conversationId]);
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
      await queryClient.cancelQueries({ queryKey: ['dm-messages', conversationId] });

      const previousMessages = queryClient.getQueryData<DMMessage[]>([
        'dm-messages',
        conversationId,
      ]);

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

      queryClient.setQueryData<DMMessage[]>(
        ['dm-messages', conversationId],
        (old) => [...(old || []), optimisticMessage]
      );

      return { previousMessages, optimisticMessage };
    },
    onSuccess: (data, { conversationId }, context) => {
      const msgData = data as DMMessage;
      queryClient.setQueryData<DMMessage[]>(
        ['dm-messages', conversationId],
        (old) => {
          if (!old) return [msgData];
          return old.map((m) =>
            m.id === context?.optimisticMessage.id ? msgData : m
          );
        }
      );
      queryClient.invalidateQueries({ queryKey: ['dm-conversations'] });
    },
    onError: (error, { conversationId }, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(
          ['dm-messages', conversationId],
          context.previousMessages
        );
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
      conversationId,
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
      await queryClient.cancelQueries({ queryKey: ['dm-messages', conversationId] });

      const previousMessages = queryClient.getQueryData<DMMessage[]>([
        'dm-messages',
        conversationId,
      ]);

      queryClient.setQueryData<DMMessage[]>(
        ['dm-messages', conversationId],
        (old) => old?.map((m) => (m.id === messageId ? { ...m, content, edited_at: new Date().toISOString() } : m)) || []
      );

      return { previousMessages };
    },
    onSuccess: () => {
      toast.success('Message modifié');
    },
    onError: (error, { conversationId }, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(['dm-messages', conversationId], context.previousMessages);
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
      conversationId,
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
      await queryClient.cancelQueries({ queryKey: ['dm-messages', conversationId] });

      const previousMessages = queryClient.getQueryData<DMMessage[]>([
        'dm-messages',
        conversationId,
      ]);

      queryClient.setQueryData<DMMessage[]>(
        ['dm-messages', conversationId],
        (old) => old?.filter((m) => m.id !== messageId) || []
      );

      return { previousMessages };
    },
    onSuccess: () => {
      toast.success('Message supprimé');
    },
    onError: (error, { conversationId }, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(['dm-messages', conversationId], context.previousMessages);
      }
      toast.error('Erreur lors de la suppression');
    },
  });
}
