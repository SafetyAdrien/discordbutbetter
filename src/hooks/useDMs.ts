import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { z } from 'zod';

// Validation schema
const targetUserSchema = z.string().uuid('Invalid user ID');

export interface DMConversation {
  id: string;
  name: string | null;
  icon_url: string | null;
  is_group: boolean;
  created_at: string | null;
  participants: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    status: 'online' | 'idle' | 'dnd' | 'offline' | null;
    bio?: string | null;
    banner_url?: string | null;
  }[];
  lastMessage?: {
    content: string;
    created_at: string;
    author_id: string | null;
    author_display_name: string | null;
  };
}

export function useDMConversations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['dm-conversations', user?.id],
    placeholderData: () => {
      try {
        const cached = sessionStorage.getItem(`cache:dm-conversations:${user?.id}`);
        return cached ? JSON.parse(cached) : undefined;
      } catch { return undefined; }
    },
    queryFn: async (): Promise<DMConversation[]> => {
      if (!user) return [];

      // Get conversations where user is participant
      const { data: participations, error: partError } = await supabase
        .from('dm_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (partError) throw partError;

      const conversationIds = participations?.map(p => p.conversation_id) || [];
      if (conversationIds.length === 0) return [];

      // Get conversation details
      const { data: conversations, error: convError } = await supabase
        .from('dm_conversations')
        .select('id, name, icon_url, is_group, created_at')
        .in('id', conversationIds);

      if (convError) throw convError;

      // Get all participants for these conversations
      const { data: allParticipants, error: allPartError } = await supabase
        .from('dm_participants')
        .select(`
          conversation_id,
          user:profiles!dm_participants_user_id_fkey (
            id, username, display_name, avatar_url, status, bio, banner_url
          )
        `)
        .in('conversation_id', conversationIds);

      if (allPartError) throw allPartError;

      // Get last message for each conversation with author info
      const { data: lastMessages, error: msgError } = await supabase
        .from('dm_messages')
        .select(`
          conversation_id, 
          content, 
          created_at,
          author_id,
          author:profiles!dm_messages_author_id_fkey (display_name)
        `)
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: false });

      if (msgError) throw msgError;

      // Combine data
      return (
        conversations?.map(conv => {
          const participants = allParticipants
            ?.filter(p => p.conversation_id === conv.id && p.user)
            .map(p => p.user as DMConversation['participants'][0])
            .filter(p => p.id !== user.id) || [];

          const lastMsg = lastMessages?.find(m => m.conversation_id === conv.id);

          return {
            ...conv,
            participants,
            lastMessage: lastMsg ? { 
              content: lastMsg.content, 
              created_at: lastMsg.created_at,
              author_id: lastMsg.author_id,
              author_display_name: (lastMsg.author as { display_name: string } | null)?.display_name || null
            } : undefined,
          };
        })
        .sort((a, b) => {
          const aMs = a.lastMessage?.created_at
            ? Date.parse(a.lastMessage.created_at)
            : a.created_at
              ? Date.parse(a.created_at)
              : 0;
          const bMs = b.lastMessage?.created_at
            ? Date.parse(b.lastMessage.created_at)
            : b.created_at
              ? Date.parse(b.created_at)
              : 0;

          return bMs - aMs;
        })
      ) || [];
    },
    enabled: !!user,
  });

  // Persist to sessionStorage
  useEffect(() => {
    if (query.data && user?.id && !query.isPlaceholderData) {
      try { sessionStorage.setItem(`cache:dm-conversations:${user.id}`, JSON.stringify(query.data)); } catch {}
    }
  }, [query.data, user?.id, query.isPlaceholderData]);

  // Real-time subscription for new messages
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`dm-updates:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'dm_messages',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['dm-conversations', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return query;
}

export function useCreateDMConversation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!user) throw new Error('Not authenticated');

      // Validate input
      const validatedUserId = targetUserSchema.parse(targetUserId);

      // Use secure database function that handles conversation creation and participant enrollment
      const { data, error } = await supabase
        .rpc('create_dm_conversation', { p_other_user_id: validatedUserId });

      if (error) throw error;

      return { conversation_id: data as string, isNew: true };
    },
    onMutate: async () => {
      if (!user) return;
      
      await queryClient.cancelQueries({ queryKey: ['dm-conversations', user.id] });
      const previousConversations = queryClient.getQueryData(['dm-conversations', user.id]);
      
      return { previousConversations };
    },
    onError: (error, _, context) => {
      if (context?.previousConversations) {
        queryClient.setQueryData(['dm-conversations', user?.id], context.previousConversations);
      }
      if (error instanceof z.ZodError) {
        toast.error('Invalid user ID');
      } else {
        toast.error('Erreur lors de la création de la conversation');
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['dm-conversations'] });
    },
  });
}
