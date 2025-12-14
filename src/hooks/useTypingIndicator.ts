import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TypingUser {
  id: string;
  user_id: string;
  profile: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
}

export function useTypingIndicator(channelId?: string | null, conversationId?: string | null, threadId?: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingRef = useRef<number>(0);
  const TYPING_DEBOUNCE = 2000; // Send typing update every 2 seconds
  const TYPING_EXPIRY = 5000; // Consider typing expired after 5 seconds

  // Cleanup typing indicator on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      // Clean up typing indicator when leaving
      if (user?.id && (channelId || conversationId || threadId)) {
        supabase
          .from('typing_indicators')
          .delete()
          .eq('user_id', user.id)
          .then(() => {});
      }
    };
  }, [user?.id, channelId, conversationId, threadId]);

  // Start typing mutation
  const startTypingMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const data: { user_id: string; channel_id?: string; conversation_id?: string; thread_id?: string } = {
        user_id: user.id,
      };
      
      if (threadId) {
        data.thread_id = threadId;
      } else if (channelId) {
        data.channel_id = channelId;
      } else if (conversationId) {
        data.conversation_id = conversationId;
      } else {
        throw new Error('No channel, conversation, or thread specified');
      }

      // Upsert typing indicator
      const { error } = await supabase
        .from('typing_indicators')
        .upsert(data, { 
          onConflict: 'user_id',
          ignoreDuplicates: false 
        });

      if (error) throw error;
    },
  });

  // Stop typing mutation
  const stopTypingMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      
      const { error } = await supabase
        .from('typing_indicators')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
    },
  });

  // Start typing with debounce
  const startTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingRef.current < TYPING_DEBOUNCE) return;
    
    lastTypingRef.current = now;
    startTypingMutation.mutate();

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing after inactivity
    typingTimeoutRef.current = setTimeout(() => {
      stopTypingMutation.mutate();
      lastTypingRef.current = 0;
    }, TYPING_EXPIRY);
  }, [startTypingMutation, stopTypingMutation]);

  // Stop typing
  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    stopTypingMutation.mutate();
    lastTypingRef.current = 0;
  }, [stopTypingMutation]);

  return {
    startTyping,
    stopTyping,
  };
}

export function useTypingUsers(channelId?: string | null, conversationId?: string | null, threadId?: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const queryKey = threadId
    ? ['typing-users', 'thread', threadId]
    : channelId 
      ? ['typing-users', 'channel', channelId]
      : conversationId 
        ? ['typing-users', 'conversation', conversationId]
        : ['typing-users', 'none'];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!channelId && !conversationId && !threadId) return [];

      let queryBuilder = supabase
        .from('typing_indicators')
        .select(`
          id,
          user_id,
          started_at,
          profile:profiles!typing_indicators_user_id_fkey (
            id,
            username,
            display_name,
            avatar_url
          )
        `);

      if (threadId) {
        queryBuilder = queryBuilder.eq('thread_id', threadId);
      } else if (channelId) {
        queryBuilder = queryBuilder.eq('channel_id', channelId);
      } else if (conversationId) {
        queryBuilder = queryBuilder.eq('conversation_id', conversationId);
      }

      const { data, error } = await queryBuilder;
      
      if (error) throw error;

      // Filter out current user and expired indicators
      const now = Date.now();
      return (data || [])
        .filter((indicator: any) => {
          if (indicator.user_id === user?.id) return false;
          const startedAt = new Date(indicator.started_at).getTime();
          return now - startedAt < 10000; // 10 second expiry
        })
        .map((indicator: any) => ({
          id: indicator.id,
          user_id: indicator.user_id,
          profile: indicator.profile,
        })) as TypingUser[];
    },
    enabled: !!(channelId || conversationId || threadId),
    refetchInterval: 3000, // Refresh every 3 seconds
  });

  // Subscribe to realtime changes
  useEffect(() => {
    if (!channelId && !conversationId && !threadId) return;

    const filterColumn = threadId ? 'thread_id' : channelId ? 'channel_id' : 'conversation_id';
    const filterValue = threadId || channelId || conversationId;

    const channel = supabase
      .channel(`typing-${filterValue}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_indicators',
          filter: `${filterColumn}=eq.${filterValue}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, conversationId, threadId, queryClient, queryKey]);

  return query;
}
