import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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
  }[];
  lastMessage?: {
    content: string;
    created_at: string;
  };
}

export function useDMConversations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['dm-conversations', user?.id],
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
            id, username, display_name, avatar_url, status
          )
        `)
        .in('conversation_id', conversationIds);

      if (allPartError) throw allPartError;

      // Get last message for each conversation
      const { data: lastMessages, error: msgError } = await supabase
        .from('dm_messages')
        .select('conversation_id, content, created_at')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: false });

      if (msgError) throw msgError;

      // Combine data
      return conversations?.map(conv => {
        const participants = allParticipants
          ?.filter(p => p.conversation_id === conv.id && p.user)
          .map(p => p.user as DMConversation['participants'][0])
          .filter(p => p.id !== user.id) || [];

        const lastMsg = lastMessages?.find(m => m.conversation_id === conv.id);

        return {
          ...conv,
          participants,
          lastMessage: lastMsg ? { content: lastMsg.content, created_at: lastMsg.created_at } : undefined,
        };
      }).sort((a, b) => {
        const aTime = a.lastMessage?.created_at || a.created_at || '';
        const bTime = b.lastMessage?.created_at || b.created_at || '';
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      }) || [];
    },
    enabled: !!user,
  });

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

      // Check if DM already exists
      const { data: existingParticipations } = await supabase
        .from('dm_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      const myConvIds = existingParticipations?.map(p => p.conversation_id) || [];

      if (myConvIds.length > 0) {
        const { data: targetParticipations } = await supabase
          .from('dm_participants')
          .select('conversation_id')
          .eq('user_id', targetUserId)
          .in('conversation_id', myConvIds);

        // Check for 1-on-1 conversation
        for (const tp of targetParticipations || []) {
          const { data: convParticipants } = await supabase
            .from('dm_participants')
            .select('user_id')
            .eq('conversation_id', tp.conversation_id);

          if (convParticipants?.length === 2) {
            // Return existing conversation
            return { conversation_id: tp.conversation_id, isNew: false };
          }
        }
      }

      // Create new conversation
      const { data: newConv, error: convError } = await supabase
        .from('dm_conversations')
        .insert({ is_group: false })
        .select()
        .single();

      if (convError) throw convError;

      // Add participants
      const { error: partError } = await supabase
        .from('dm_participants')
        .insert([
          { conversation_id: newConv.id, user_id: user.id },
          { conversation_id: newConv.id, user_id: targetUserId },
        ]);

      if (partError) throw partError;

      return { conversation_id: newConv.id, isNew: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dm-conversations'] });
    },
    onError: () => {
      toast.error('Erreur lors de la création de la conversation');
    },
  });
}
