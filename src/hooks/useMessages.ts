import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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

  const query = useQuery({
    queryKey: ['messages', channelId],
    queryFn: async (): Promise<MessageWithAuthor[]> => {
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
      
      // Parse attachments from JSON
      return (data as any[]).map(msg => ({
        ...msg,
        attachments: Array.isArray(msg.attachments) ? msg.attachments : []
      })) as MessageWithAuthor[];
    },
    enabled: !!channelId && !!user,
    placeholderData: () => {
      try {
        const cached = sessionStorage.getItem(`cache:messages:${channelId}`);
        return cached ? JSON.parse(cached) : undefined;
      } catch { return undefined; }
    },
  });

  // Persist to sessionStorage
  useEffect(() => {
    if (query.data && channelId && !query.isPlaceholderData) {
      try {
        sessionStorage.setItem(`cache:messages:${channelId}`, JSON.stringify(query.data));
      } catch { /* quota exceeded */ }
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
            const parsedData = {
              ...data,
              attachments: Array.isArray(data.attachments) ? data.attachments : []
            };
            queryClient.setQueryData(
              ['messages', channelId],
              (old: MessageWithAuthor[] | undefined) => {
                if (!old) return [parsedData];
                // Check if message already exists
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
    }: {
      channelId: string;
      content: string;
      attachments?: PendingAttachment[];
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

      const { data, error } = await supabase
        .from('messages')
        .insert({
          channel_id: channelId,
          content: validated.content,
          author_id: user.id,
          attachments: uploadedAttachments.length > 0 ? (uploadedAttachments as unknown as any) : [],
        })
        .select(`
          id,
          content,
          created_at,
          edited_at,
          attachments,
          channel_id,
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
      return {
        ...data,
        attachments: (Array.isArray(data.attachments) ? data.attachments : []) as unknown as StoredAttachment[]
      } as MessageWithAuthor;
    },
    onMutate: async ({ channelId, content, attachments = [] }) => {
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

      // Optimistically add the message
      const optimisticMessage: MessageWithAuthor = {
        id: `temp-${Date.now()}`,
        content,
        created_at: new Date().toISOString(),
        edited_at: null,
        attachments: optimisticAttachments,
        channel_id: channelId,
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
