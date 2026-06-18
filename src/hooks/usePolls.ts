import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useEffect } from 'react';
import { cacheGetSync, cacheSetAsync } from '@/lib/cache';

export interface Poll {
  id: string;
  channel_id: string;
  thread_id: string | null;
  author_id: string | null;
  question: string;
  allow_multiple: boolean;
  expires_at: string | null;
  created_at: string;
  author?: {
    id: string;
    display_name: string;
    avatar_url: string | null;
    username: string;
  };
  options: PollOption[];
  votes: PollVote[];
}

export interface PollOption {
  id: string;
  poll_id: string;
  text: string;
  emoji: string | null;
  position: number;
}

export interface PollVote {
  id: string;
  poll_id: string;
  option_id: string;
  user_id: string;
  created_at: string;
  user?: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  };
}

export interface CreatePollData {
  channelId: string;
  threadId?: string | null;
  question: string;
  options: { text: string; emoji: string | null }[];
  allowMultiple: boolean;
  expiresAt: Date | null;
}

export function usePolls(channelId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['polls', 'channel', channelId],
    queryFn: async () => {
      if (!channelId) return [];

      const { data: polls, error } = await supabase
        .from('polls')
        .select(`
          *,
          author:profiles!polls_author_id_fkey(id, display_name, avatar_url, username)
        `)
        .eq('channel_id', channelId)
        .is('thread_id', null)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch options and votes for each poll
      const pollsWithDetails = await Promise.all(
        (polls || []).map(async (poll) => {
          const [optionsRes, votesRes] = await Promise.all([
            supabase
              .from('poll_options')
              .select('*')
              .eq('poll_id', poll.id)
              .order('position', { ascending: true }),
            supabase
              .from('poll_votes')
              .select(`
                *,
                user:profiles!poll_votes_user_id_fkey(id, display_name, avatar_url)
              `)
              .eq('poll_id', poll.id)
          ]);

          return {
            ...poll,
            options: optionsRes.data || [],
            votes: votesRes.data || []
          };
        })
      );

      return pollsWithDetails as Poll[];
    },
    enabled: !!channelId && !!user,
    placeholderData: () => cacheGetSync(`polls:channel:${channelId}`),
  });

  useEffect(() => {
    if (query.data && channelId && !query.isPlaceholderData) {
      cacheSetAsync(`polls:channel:${channelId}`, query.data);
    }
  }, [query.data, channelId, query.isPlaceholderData]);

  // Real-time subscription for polls (creation, update, deletion)
  useEffect(() => {
    if (!channelId) return;

    const pollsChannel = supabase
      .channel(`polls-realtime-${channelId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'polls' },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const newPoll = payload.new as any;
            if (newPoll.channel_id !== channelId || newPoll.thread_id !== null) return;
            // Fetch complete poll with author, options, votes
            const [pollRes, optionsRes, votesRes] = await Promise.all([
              supabase.from('polls').select('*, author:profiles!polls_author_id_fkey(id, display_name, avatar_url, username)').eq('id', newPoll.id).single(),
              supabase.from('poll_options').select('*').eq('poll_id', newPoll.id).order('position'),
              supabase.from('poll_votes').select('*, user:profiles!poll_votes_user_id_fkey(id, display_name, avatar_url)').eq('poll_id', newPoll.id)
            ]);
            if (pollRes.data) {
              const fullPoll = { ...pollRes.data, options: optionsRes.data || [], votes: votesRes.data || [] };
              queryClient.setQueryData<Poll[]>(['polls', 'channel', channelId], old => {
                if (!old) return [fullPoll as Poll];
                // Remove any optimistic temp polls from the same author with the same question, plus dedupe by real id
                const cleaned = old.filter(p =>
                  p.id !== fullPoll.id &&
                  !(p.id.startsWith('temp-') && p.author_id === fullPoll.author_id && p.question === fullPoll.question)
                );
                return [...cleaned, fullPoll as Poll];
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as any;
            queryClient.setQueryData<Poll[]>(['polls', 'channel', channelId], old =>
              old?.map(p => p.id === updated.id ? { ...p, question: updated.question, expires_at: updated.expires_at, allow_multiple: updated.allow_multiple } : p)
            );
          } else if (payload.eventType === 'DELETE') {
            const deleted = payload.old as any;
            queryClient.setQueryData<Poll[]>(['polls', 'channel', channelId], old =>
              old?.filter(p => p.id !== deleted.id)
            );
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(pollsChannel); };
  }, [channelId, queryClient]);

  // Real-time subscription for poll options changes
  useEffect(() => {
    if (!channelId) return;

    const optionsChannel = supabase
      .channel(`poll-options-realtime-${channelId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'poll_options' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['polls', 'channel', channelId] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(optionsChannel); };
  }, [channelId, queryClient]);

  // Real-time subscription for votes with targeted cache updates
  useEffect(() => {
    if (!channelId) return;

    const votesChannel = supabase
      .channel(`poll-votes-realtime-${channelId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'poll_votes' },
        async (payload) => {
          const newVote = payload.new as any;
          // Fetch voter profile
          const { data: profile } = await supabase.from('profiles').select('id, display_name, avatar_url').eq('id', newVote.user_id).single();
          queryClient.setQueryData<Poll[]>(['polls', 'channel', channelId], old =>
            old?.map(p => p.id === newVote.poll_id ? {
              ...p,
              votes: [
                // Drop optimistic temp vote for this (user, option), and any duplicate by id
                ...p.votes.filter(v =>
                  v.id !== newVote.id &&
                  !(v.id.startsWith('temp-') && v.user_id === newVote.user_id && v.option_id === newVote.option_id)
                ),
                { ...newVote, user: profile || undefined }
              ]
            } : p)
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'poll_votes' },
        (payload) => {
          const deleted = payload.old as any;
          queryClient.setQueryData<Poll[]>(['polls', 'channel', channelId], old =>
            old?.map(p => p.id === deleted.poll_id ? {
              ...p,
              votes: p.votes.filter(v => v.id !== deleted.id)
            } : p)
          );
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(votesChannel); };
  }, [channelId, queryClient]);

  return query;
}

export function useThreadPolls(threadId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['polls', 'thread', threadId],
    queryFn: async () => {
      if (!threadId) return [];

      const { data: polls, error } = await supabase
        .from('polls')
        .select(`
          *,
          author:profiles!polls_author_id_fkey(id, display_name, avatar_url, username)
        `)
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch options and votes for each poll
      const pollsWithDetails = await Promise.all(
        (polls || []).map(async (poll) => {
          const [optionsRes, votesRes] = await Promise.all([
            supabase
              .from('poll_options')
              .select('*')
              .eq('poll_id', poll.id)
              .order('position', { ascending: true }),
            supabase
              .from('poll_votes')
              .select(`
                *,
                user:profiles!poll_votes_user_id_fkey(id, display_name, avatar_url)
              `)
              .eq('poll_id', poll.id)
          ]);

          return {
            ...poll,
            options: optionsRes.data || [],
            votes: votesRes.data || []
          };
        })
      );

      return pollsWithDetails as Poll[];
    },
    enabled: !!threadId && !!user,
    placeholderData: () => cacheGetSync(`polls:thread:${threadId}`),
  });

  useEffect(() => {
    if (query.data && threadId && !query.isPlaceholderData) {
      cacheSetAsync(`polls:thread:${threadId}`, query.data);
    }
  }, [query.data, threadId, query.isPlaceholderData]);

  // Real-time subscription for polls
  useEffect(() => {
    if (!threadId) return;

    const pollsChannel = supabase
      .channel(`polls-realtime-thread-${threadId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'polls' },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const newPoll = payload.new as any;
            if (newPoll.thread_id !== threadId) return;
            const [pollRes, optionsRes, votesRes] = await Promise.all([
              supabase.from('polls').select('*, author:profiles!polls_author_id_fkey(id, display_name, avatar_url, username)').eq('id', newPoll.id).single(),
              supabase.from('poll_options').select('*').eq('poll_id', newPoll.id).order('position'),
              supabase.from('poll_votes').select('*, user:profiles!poll_votes_user_id_fkey(id, display_name, avatar_url)').eq('poll_id', newPoll.id)
            ]);
            if (pollRes.data) {
              const fullPoll = { ...pollRes.data, options: optionsRes.data || [], votes: votesRes.data || [] };
              queryClient.setQueryData<Poll[]>(['polls', 'thread', threadId], old => {
                if (!old) return [fullPoll as Poll];
                const cleaned = old.filter(p =>
                  p.id !== fullPoll.id &&
                  !(p.id.startsWith('temp-') && p.author_id === fullPoll.author_id && p.question === fullPoll.question)
                );
                return [...cleaned, fullPoll as Poll];
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as any;
            queryClient.setQueryData<Poll[]>(['polls', 'thread', threadId], old =>
              old?.map(p => p.id === updated.id ? { ...p, question: updated.question, expires_at: updated.expires_at, allow_multiple: updated.allow_multiple } : p)
            );
          } else if (payload.eventType === 'DELETE') {
            const deleted = payload.old as any;
            queryClient.setQueryData<Poll[]>(['polls', 'thread', threadId], old =>
              old?.filter(p => p.id !== deleted.id)
            );
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(pollsChannel); };
  }, [threadId, queryClient]);

  // Real-time subscription for poll options
  useEffect(() => {
    if (!threadId) return;

    const optionsChannel = supabase
      .channel(`poll-options-realtime-thread-${threadId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'poll_options' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['polls', 'thread', threadId] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(optionsChannel); };
  }, [threadId, queryClient]);

  // Real-time subscription for votes
  useEffect(() => {
    if (!threadId) return;

    const votesChannel = supabase
      .channel(`poll-votes-realtime-thread-${threadId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'poll_votes' },
        async (payload) => {
          const newVote = payload.new as any;
          const { data: profile } = await supabase.from('profiles').select('id, display_name, avatar_url').eq('id', newVote.user_id).single();
          queryClient.setQueryData<Poll[]>(['polls', 'thread', threadId], old =>
            old?.map(p => p.id === newVote.poll_id ? {
              ...p,
              votes: [
                ...p.votes.filter(v =>
                  v.id !== newVote.id &&
                  !(v.id.startsWith('temp-') && v.user_id === newVote.user_id && v.option_id === newVote.option_id)
                ),
                { ...newVote, user: profile || undefined }
              ]
            } : p)
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'poll_votes' },
        (payload) => {
          const deleted = payload.old as any;
          queryClient.setQueryData<Poll[]>(['polls', 'thread', threadId], old =>
            old?.map(p => p.id === deleted.poll_id ? {
              ...p,
              votes: p.votes.filter(v => v.id !== deleted.id)
            } : p)
          );
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(votesChannel); };
  }, [threadId, queryClient]);

  return query;
}

export function useCreatePoll() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (data: CreatePollData) => {
      if (!user) throw new Error('Not authenticated');

      // Create poll
      const { data: poll, error: pollError } = await supabase
        .from('polls')
        .insert({
          channel_id: data.channelId,
          thread_id: data.threadId || null,
          author_id: user.id,
          question: data.question,
          allow_multiple: data.allowMultiple,
          expires_at: data.expiresAt?.toISOString() || null
        })
        .select()
        .single();

      if (pollError) throw pollError;

      // Create options
      const optionsToInsert = data.options.map((opt, index) => ({
        poll_id: poll.id,
        text: opt.text,
        emoji: opt.emoji,
        position: index
      }));

      const { error: optionsError } = await supabase
        .from('poll_options')
        .insert(optionsToInsert);

      if (optionsError) throw optionsError;

      return poll;
    },
    onMutate: async (data) => {
      if (!user) return;
      
      const queryKey = data.threadId 
        ? ['polls', 'thread', data.threadId] 
        : ['polls', 'channel', data.channelId];
      
      await queryClient.cancelQueries({ queryKey });
      const previousPolls = queryClient.getQueryData<Poll[]>(queryKey);
      
      const tempPoll: Poll = {
        id: `temp-${Date.now()}`,
        channel_id: data.channelId,
        thread_id: data.threadId || null,
        author_id: user.id,
        question: data.question,
        allow_multiple: data.allowMultiple,
        expires_at: data.expiresAt?.toISOString() || null,
        created_at: new Date().toISOString(),
        author: profile ? {
          id: user.id,
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
          username: profile.username,
        } : undefined,
        options: data.options.map((opt, i) => ({
          id: `temp-opt-${i}`,
          poll_id: `temp-${Date.now()}`,
          text: opt.text,
          emoji: opt.emoji,
          position: i
        })),
        votes: []
      };
      
      queryClient.setQueryData<Poll[]>(queryKey, old => 
        old ? [...old, tempPoll] : [tempPoll]
      );
      
      return { previousPolls, queryKey };
    },
    onError: (_, __, context) => {
      if (context?.previousPolls && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousPolls);
      }
      toast.error('Erreur lors de la création du sondage');
    },
    onSuccess: (poll, variables) => {
      // Replace the optimistic temp poll with the real one in-place to avoid duplicate/flicker.
      const queryKey = variables.threadId
        ? ['polls', 'thread', variables.threadId]
        : ['polls', 'channel', variables.channelId];
      queryClient.setQueryData<Poll[]>(queryKey, old => {
        if (!old) return old;
        // If the realtime INSERT already injected the real poll, just clean temp leftovers.
        const hasReal = old.some(p => p.id === poll.id);
        const cleaned = old.filter(p => !p.id.startsWith('temp-'));
        if (hasReal) return cleaned;
        // Swap the temp poll with the real id while keeping the optimistic shape.
        const tempIdx = old.findIndex(p => p.id.startsWith('temp-') && p.question === poll.question && p.author_id === poll.author_id);
        if (tempIdx === -1) return cleaned;
        const merged: Poll = {
          ...(old[tempIdx] as Poll),
          id: poll.id,
          created_at: poll.created_at,
          expires_at: poll.expires_at,
        };
        return [...cleaned.filter(p => p.id !== merged.id), merged];
      });
      toast.success('Sondage créé');
    },
    // No onSettled invalidation: optimistic swap + realtime keep the cache in sync without flicker.
  });
}

export function useVotePoll() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ pollId, optionId, channelId, threadId }: { pollId: string; optionId: string; channelId: string; threadId?: string | null }) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('poll_votes')
        .insert({
          poll_id: pollId,
          option_id: optionId,
          user_id: user.id
        });

      if (error) throw error;
    },
    onMutate: async ({ pollId, optionId, channelId, threadId }) => {
      const queryKey = threadId ? ['polls', 'thread', threadId] : ['polls', 'channel', channelId];
      await queryClient.cancelQueries({ queryKey });
      const previousPolls = queryClient.getQueryData<Poll[]>(queryKey);

      if (previousPolls && user) {
        queryClient.setQueryData<Poll[]>(queryKey, (old) =>
          old?.map((poll) =>
            poll.id === pollId
              ? {
                  ...poll,
                  votes: [
                    // Avoid stacking duplicates if optimistic fires twice for same (user, option)
                    ...poll.votes.filter(v => !(v.user_id === user.id && v.option_id === optionId)),
                    {
                      id: `temp-${user.id}-${optionId}`,
                      poll_id: pollId,
                      option_id: optionId,
                      user_id: user.id,
                      created_at: new Date().toISOString()
                    }
                  ]
                }
              : poll
          )
        );
      }

      return { previousPolls, queryKey };
    },
    onError: (_, variables, context) => {
      if (context?.previousPolls && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousPolls);
      }
      toast.error('Erreur lors du vote');
    },
    // No onSettled invalidation — realtime INSERT swaps the temp vote for the real one with no flicker.
  });
}

export function useRemoveVote() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ pollId, optionId, channelId, threadId }: { pollId: string; optionId: string; channelId: string; threadId?: string | null }) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('poll_votes')
        .delete()
        .eq('poll_id', pollId)
        .eq('option_id', optionId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onMutate: async ({ pollId, optionId, channelId, threadId }) => {
      const queryKey = threadId ? ['polls', 'thread', threadId] : ['polls', 'channel', channelId];
      await queryClient.cancelQueries({ queryKey });
      const previousPolls = queryClient.getQueryData<Poll[]>(queryKey);

      if (previousPolls && user) {
        queryClient.setQueryData<Poll[]>(queryKey, (old) =>
          old?.map((poll) =>
            poll.id === pollId
              ? {
                  ...poll,
                  votes: poll.votes.filter(
                    (v) => !(v.option_id === optionId && v.user_id === user.id)
                  )
                }
              : poll
          )
        );
      }

      return { previousPolls, queryKey };
    },
    onError: (_, variables, context) => {
      if (context?.previousPolls && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousPolls);
      }
      toast.error('Erreur lors de la suppression du vote');
    },
    onSettled: (_, __, variables) => {
      const queryKey = variables.threadId ? ['polls', 'thread', variables.threadId] : ['polls', 'channel', variables.channelId];
      queryClient.invalidateQueries({ queryKey });
    }
  });
}

export function useEndPoll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ pollId, channelId, threadId }: { pollId: string; channelId: string; threadId?: string | null }) => {
      const { error } = await supabase
        .from('polls')
        .update({ expires_at: new Date().toISOString() })
        .eq('id', pollId);

      if (error) throw error;
    },
    onMutate: async ({ pollId, channelId, threadId }) => {
      const queryKey = threadId ? ['polls', 'thread', threadId] : ['polls', 'channel', channelId];
      await queryClient.cancelQueries({ queryKey });
      const previousPolls = queryClient.getQueryData<Poll[]>(queryKey);

      queryClient.setQueryData<Poll[]>(queryKey, old =>
        old?.map(poll =>
          poll.id === pollId
            ? { ...poll, expires_at: new Date().toISOString() }
            : poll
        )
      );

      return { previousPolls, queryKey };
    },
    onError: (_, __, context) => {
      if (context?.previousPolls && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousPolls);
      }
      toast.error('Erreur lors de la clôture du sondage');
    },
    onSuccess: () => {
      toast.success('Sondage terminé');
    },
    onSettled: (_, __, variables) => {
      if (variables.threadId) {
        queryClient.invalidateQueries({ queryKey: ['polls', 'thread', variables.threadId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['polls', 'channel', variables.channelId] });
      }
    }
  });
}

export function useDeletePoll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ pollId, channelId, threadId }: { pollId: string; channelId: string; threadId?: string | null }) => {
      const { error } = await supabase
        .from('polls')
        .delete()
        .eq('id', pollId);

      if (error) throw error;
    },
    onMutate: async ({ pollId, channelId, threadId }) => {
      const queryKey = threadId ? ['polls', 'thread', threadId] : ['polls', 'channel', channelId];
      await queryClient.cancelQueries({ queryKey });
      const previousPolls = queryClient.getQueryData<Poll[]>(queryKey);
      
      queryClient.setQueryData<Poll[]>(queryKey, old => 
        old?.filter(p => p.id !== pollId)
      );
      
      return { previousPolls, queryKey };
    },
    onError: (_, __, context) => {
      if (context?.previousPolls && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousPolls);
      }
      toast.error('Erreur lors de la suppression du sondage');
    },
    onSuccess: () => {
      toast.success('Sondage supprimé');
    },
    onSettled: (_, __, variables) => {
      if (variables.threadId) {
        queryClient.invalidateQueries({ queryKey: ['polls', 'thread', variables.threadId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['polls', 'channel', variables.channelId] });
      }
    }
  });
}

export interface UpdatePollData {
  pollId: string;
  channelId: string;
  threadId?: string | null;
  question: string;
  options: { id?: string; text: string; emoji: string | null }[];
}

export function useUpdatePoll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdatePollData) => {
      // Update poll question
      const { error: pollError } = await supabase
        .from('polls')
        .update({ question: data.question })
        .eq('id', data.pollId);

      if (pollError) throw pollError;

      // Delete existing options
      const { error: deleteError } = await supabase
        .from('poll_options')
        .delete()
        .eq('poll_id', data.pollId);

      if (deleteError) throw deleteError;

      // Insert new options
      const optionsToInsert = data.options.map((opt, index) => ({
        poll_id: data.pollId,
        text: opt.text,
        emoji: opt.emoji,
        position: index
      }));

      const { error: optionsError } = await supabase
        .from('poll_options')
        .insert(optionsToInsert);

      if (optionsError) throw optionsError;
    },
    onMutate: async (data) => {
      const queryKey = data.threadId ? ['polls', 'thread', data.threadId] : ['polls', 'channel', data.channelId];
      await queryClient.cancelQueries({ queryKey });
      const previousPolls = queryClient.getQueryData<Poll[]>(queryKey);
      
      queryClient.setQueryData<Poll[]>(queryKey, old => 
        old?.map(poll => 
          poll.id === data.pollId 
            ? {
                ...poll,
                question: data.question,
                options: data.options.map((opt, i) => ({
                  id: opt.id || `temp-opt-${i}`,
                  poll_id: data.pollId,
                  text: opt.text,
                  emoji: opt.emoji,
                  position: i
                }))
              }
            : poll
        )
      );
      
      return { previousPolls, queryKey };
    },
    onError: (_, __, context) => {
      if (context?.previousPolls && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousPolls);
      }
      toast.error('Erreur lors de la modification du sondage');
    },
    onSuccess: () => {
      toast.success('Sondage modifié');
    },
    onSettled: (_, __, variables) => {
      if (variables.threadId) {
        queryClient.invalidateQueries({ queryKey: ['polls', 'thread', variables.threadId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['polls', 'channel', variables.channelId] });
      }
    }
  });
}
