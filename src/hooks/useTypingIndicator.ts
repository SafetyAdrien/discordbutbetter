import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { acquireSharedRealtimeEffect, subscribeWithDiagnostics } from '@/lib/realtimeDiagnostics';
import { isTypingUserFresh, type TypingUser } from '@/lib/typingIndicator';

type TypingContext = {
  channel_id?: string;
  conversation_id?: string;
  thread_id?: string;
};

const HEARTBEAT_INTERVAL_MS = 2000;
const TYPING_IDLE_MS = 5000;
const TYPING_EXPIRY_MS = 10_000;

function getTypingContext(
  channelId?: string | null,
  conversationId?: string | null,
  threadId?: string | null,
): TypingContext | null {
  if (threadId) return { thread_id: threadId };
  if (channelId) return { channel_id: channelId };
  if (conversationId) return { conversation_id: conversationId };
  return null;
}

function getContextKey(context: TypingContext | null): string | null {
  if (context?.thread_id) return `thread:${context.thread_id}`;
  if (context?.channel_id) return `channel:${context.channel_id}`;
  if (context?.conversation_id) return `conversation:${context.conversation_id}`;
  return null;
}

export function useTypingIndicator(
  channelId?: string | null,
  conversationId?: string | null,
  threadId?: string | null,
) {
  const { user } = useAuth();
  const context = useMemo(
    () => getTypingContext(channelId, conversationId, threadId),
    [channelId, conversationId, threadId],
  );
  const contextKey = getContextKey(context);
  const userId = user?.id;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastHeartbeatRef = useRef(0);
  const activeRef = useRef(false);
  const operationQueueRef = useRef<Promise<void>>(Promise.resolve());

  const enqueue = useCallback((operation: () => Promise<void>, label: string) => {
    const next = operationQueueRef.current.then(operation);
    operationQueueRef.current = next.catch((error: unknown) => {
      console.error(label, error);
    });
  }, []);

  const writeTyping = useCallback(async () => {
    if (!userId || !context) return;

    const { data: existing, error: updateError } = await supabase
      .from('typing_indicators')
      .update({ started_at: new Date().toISOString() })
      .eq('user_id', userId)
      .match(context)
      .select('id')
      .limit(1)
      .maybeSingle();

    if (updateError) throw updateError;
    if (existing) return;

    const { error: insertError } = await supabase
      .from('typing_indicators')
      .insert({ user_id: userId, ...context });

    if (insertError?.code === '23505') {
      const { error: retryUpdateError } = await supabase
        .from('typing_indicators')
        .update({ started_at: new Date().toISOString() })
        .eq('user_id', userId)
        .match(context);
      if (retryUpdateError) throw retryUpdateError;
      return;
    }
    if (insertError) throw insertError;
  }, [context, userId]);

  const clearTyping = useCallback(async () => {
    if (!userId || !context) return;
    const { error } = await supabase
      .from('typing_indicators')
      .delete()
      .eq('user_id', userId)
      .match(context);
    if (error) throw error;
  }, [context, userId]);

  const stopTyping = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const wasActive = activeRef.current;
    activeRef.current = false;
    lastHeartbeatRef.current = 0;
    if (wasActive) enqueue(clearTyping, 'Failed to stop typing indicator:');
  }, [clearTyping, enqueue]);

  const startTyping = useCallback(() => {
    if (!userId || !contextKey) return;

    activeRef.current = true;
    const now = Date.now();
    if (now - lastHeartbeatRef.current >= HEARTBEAT_INTERVAL_MS) {
      lastHeartbeatRef.current = now;
      enqueue(writeTyping, 'Failed to update typing indicator:');
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(stopTyping, TYPING_IDLE_MS);
  }, [contextKey, enqueue, stopTyping, userId, writeTyping]);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (!activeRef.current) return;
    activeRef.current = false;
    enqueue(clearTyping, 'Failed to clear typing indicator:');
  }, [clearTyping, enqueue]);

  return { startTyping, stopTyping };
}

export function useTypingUsers(
  channelId?: string | null,
  conversationId?: string | null,
  threadId?: string | null,
) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const context = useMemo(
    () => getTypingContext(channelId, conversationId, threadId),
    [channelId, conversationId, threadId],
  );
  const contextKey = getContextKey(context);
  const queryKey = useMemo(
    () => ['typing-users', contextKey ?? 'none'],
    [contextKey],
  );
  const userId = user?.id;

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<TypingUser[]> => {
      if (!context) return [];

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

      if (context.thread_id) {
        queryBuilder = queryBuilder.eq('thread_id', context.thread_id);
      } else if (context.channel_id) {
        queryBuilder = queryBuilder.eq('channel_id', context.channel_id);
      } else if (context.conversation_id) {
        queryBuilder = queryBuilder.eq('conversation_id', context.conversation_id);
      }

      const { data, error } = await queryBuilder;
      if (error) throw error;

      return (data ?? [])
        .filter((indicator) =>
          indicator.user_id !== userId &&
          isTypingUserFresh(indicator, Date.now(), TYPING_EXPIRY_MS)
        ) as TypingUser[];
    },
    enabled: !!contextKey,
    refetchInterval: TYPING_EXPIRY_MS / 2,
  });

  useEffect(() => {
    if (!contextKey || !context) return;

    return acquireSharedRealtimeEffect(`typing-users:${contextKey}`, () => {
      const filterColumn = context.thread_id
        ? 'thread_id'
        : context.channel_id
          ? 'channel_id'
          : 'conversation_id';
      const filterValue = context.thread_id ?? context.channel_id ?? context.conversation_id;
      const channel = supabase
        .channel(`typing-${contextKey}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'typing_indicators',
            filter: `${filterColumn}=eq.${filterValue}`,
          },
          () => {
            void queryClient.invalidateQueries({ queryKey });
          },
        );
      const stopDiagnostics = subscribeWithDiagnostics(
        channel,
        `typing-users-${contextKey}`,
        (status) => {
          if (status === 'SUBSCRIBED') {
            void queryClient.invalidateQueries({ queryKey });
          }
        },
      );

      return () => {
        stopDiagnostics();
        void supabase.removeChannel(channel);
      };
    });
  }, [context, contextKey, queryClient, queryKey]);

  return query;
}
