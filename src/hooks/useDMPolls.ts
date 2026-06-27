import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useEffect } from 'react';
import { cacheGetSync, cacheSetAsync } from '@/lib/cache';

export interface DMPoll {
  id: string;
  conversation_id: string;
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
  options: DMPollOption[];
  votes: DMPollVote[];
}

export interface DMPollOption {
  id: string;
  poll_id: string;
  text: string;
  emoji: string | null;
  position: number;
}

export interface DMPollVote {
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

export interface CreateDMPollData {
  conversationId: string;
  question: string;
  options: { text: string; emoji: string | null }[];
  allowMultiple: boolean;
  expiresAt: Date | null;
}

const keyFor = (conversationId: string | null) => ['polls', 'dm', conversationId] as const;
const cacheKey = (conversationId: string) => `polls:dm:${conversationId}`;

export function useDMPolls(conversationId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: keyFor(conversationId),
    queryFn: async () => {
      if (!conversationId) return [];

      const { data: polls, error } = await supabase
        .from('dm_polls' as any)
        .select(`
          *,
          author:profiles!dm_polls_author_id_fkey(id, display_name, avatar_url, username)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const pollsWithDetails = await Promise.all(
        ((polls as any[]) || []).map(async (poll: any) => {
          const [optionsRes, votesRes] = await Promise.all([
            supabase
              .from('dm_poll_options' as any)
              .select('*')
              .eq('poll_id', poll.id)
              .order('position', { ascending: true }),
            supabase
              .from('dm_poll_votes' as any)
              .select(`*, user:profiles!dm_poll_votes_user_id_fkey(id, display_name, avatar_url)`)
              .eq('poll_id', poll.id),
          ]);
          return {
            ...poll,
            options: (optionsRes.data as any[]) || [],
            votes: (votesRes.data as any[]) || [],
          };
        }),
      );

      return pollsWithDetails as DMPoll[];
    },
    enabled: !!conversationId && !!user,
    placeholderData: () => (conversationId ? cacheGetSync(cacheKey(conversationId)) : undefined),
  });

  useEffect(() => {
    if (query.data && conversationId && !query.isPlaceholderData) {
      cacheSetAsync(cacheKey(conversationId), query.data);
    }
  }, [query.data, conversationId, query.isPlaceholderData]);

  // Realtime: polls
  useEffect(() => {
    if (!conversationId) return;
    const ch = supabase
      .channel(`dm-polls-${conversationId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dm_polls' }, async (payload) => {
        if (payload.eventType === 'INSERT') {
          const newPoll = payload.new as any;
          if (newPoll.conversation_id !== conversationId) return;
          const [pollRes, optionsRes, votesRes] = await Promise.all([
            supabase.from('dm_polls' as any).select('*, author:profiles!dm_polls_author_id_fkey(id, display_name, avatar_url, username)').eq('id', newPoll.id).single(),
            supabase.from('dm_poll_options' as any).select('*').eq('poll_id', newPoll.id).order('position'),
            supabase.from('dm_poll_votes' as any).select('*, user:profiles!dm_poll_votes_user_id_fkey(id, display_name, avatar_url)').eq('poll_id', newPoll.id),
          ]);
          if (pollRes.data) {
            const fullPoll = { ...(pollRes.data as any), options: (optionsRes.data as any[]) || [], votes: (votesRes.data as any[]) || [] };
            queryClient.setQueryData<DMPoll[]>(keyFor(conversationId), (old) => {
              if (!old) return [fullPoll as DMPoll];
              const cleaned = old.filter(
                (p) =>
                  p.id !== fullPoll.id &&
                  !(p.id.startsWith('temp-') && p.author_id === fullPoll.author_id && p.question === fullPoll.question),
              );
              return [...cleaned, fullPoll as DMPoll];
            });
          }
        } else if (payload.eventType === 'UPDATE') {
          const updated = payload.new as any;
          queryClient.setQueryData<DMPoll[]>(keyFor(conversationId), (old) =>
            old?.map((p) => (p.id === updated.id ? { ...p, question: updated.question, expires_at: updated.expires_at, allow_multiple: updated.allow_multiple } : p)),
          );
        } else if (payload.eventType === 'DELETE') {
          const deleted = payload.old as any;
          queryClient.setQueryData<DMPoll[]>(keyFor(conversationId), (old) => old?.filter((p) => p.id !== deleted.id));
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [conversationId, queryClient]);

  // Realtime: options
  useEffect(() => {
    if (!conversationId) return;
    const ch = supabase
      .channel(`dm-poll-options-${conversationId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dm_poll_options' }, () => {
        queryClient.invalidateQueries({ queryKey: keyFor(conversationId) });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [conversationId, queryClient]);

  // Realtime: votes
  useEffect(() => {
    if (!conversationId) return;
    const ch = supabase
      .channel(`dm-poll-votes-${conversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dm_poll_votes' }, async (payload) => {
        const newVote = payload.new as any;
        const { data: profile } = await supabase.from('profiles').select('id, display_name, avatar_url').eq('id', newVote.user_id).single();
        queryClient.setQueryData<DMPoll[]>(keyFor(conversationId), (old) =>
          old?.map((p) =>
            p.id === newVote.poll_id
              ? {
                  ...p,
                  votes: [
                    ...p.votes.filter(
                      (v) => v.id !== newVote.id && !(v.id.startsWith('temp-') && v.user_id === newVote.user_id && v.option_id === newVote.option_id),
                    ),
                    { ...newVote, user: (profile as any) || undefined },
                  ],
                }
              : p,
          ),
        );
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'dm_poll_votes' }, (payload) => {
        const deleted = payload.old as any;
        queryClient.setQueryData<DMPoll[]>(keyFor(conversationId), (old) =>
          old?.map((p) => (p.id === deleted.poll_id ? { ...p, votes: p.votes.filter((v) => v.id !== deleted.id) } : p)),
        );
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [conversationId, queryClient]);

  return query;
}

export function useCreateDMPoll() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateDMPollData) => {
      if (!user) throw new Error('Not authenticated');

      const { data: poll, error: pollError } = await supabase
        .from('dm_polls' as any)
        .insert({
          conversation_id: data.conversationId,
          author_id: user.id,
          question: data.question,
          allow_multiple: data.allowMultiple,
          expires_at: data.expiresAt?.toISOString() || null,
        } as any)
        .select()
        .single();

      if (pollError) throw pollError;

      const optionsToInsert = data.options.map((opt, index) => ({
        poll_id: (poll as any).id,
        text: opt.text,
        emoji: opt.emoji,
        position: index,
      }));

      const { error: optionsError } = await supabase.from('dm_poll_options' as any).insert(optionsToInsert as any);
      if (optionsError) throw optionsError;

      return poll as any;
    },
    onMutate: async (data) => {
      if (!user) return;
      const queryKey = keyFor(data.conversationId);
      await queryClient.cancelQueries({ queryKey });
      const previousPolls = queryClient.getQueryData<DMPoll[]>(queryKey);

      const tempId = `temp-${Date.now()}`;
      const tempPoll: DMPoll = {
        id: tempId,
        conversation_id: data.conversationId,
        author_id: user.id,
        question: data.question,
        allow_multiple: data.allowMultiple,
        expires_at: data.expiresAt?.toISOString() || null,
        created_at: new Date().toISOString(),
        author: profile
          ? { id: user.id, display_name: profile.display_name, avatar_url: profile.avatar_url, username: profile.username }
          : undefined,
        options: data.options.map((opt, i) => ({
          id: `temp-opt-${i}`,
          poll_id: tempId,
          text: opt.text,
          emoji: opt.emoji,
          position: i,
        })),
        votes: [],
      };

      queryClient.setQueryData<DMPoll[]>(queryKey, (old) => (old ? [...old, tempPoll] : [tempPoll]));
      return { previousPolls, queryKey };
    },
    onError: (_, __, context) => {
      if (context?.previousPolls && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousPolls);
      }
      toast.error('Erreur lors de la création du sondage');
    },
    onSuccess: (poll, variables) => {
      const queryKey = keyFor(variables.conversationId);
      queryClient.setQueryData<DMPoll[]>(queryKey, (old) => {
        if (!old) return old;
        const hasReal = old.some((p) => p.id === poll.id);
        const cleaned = old.filter((p) => !p.id.startsWith('temp-'));
        if (hasReal) return cleaned;
        const tempIdx = old.findIndex(
          (p) => p.id.startsWith('temp-') && p.question === poll.question && p.author_id === poll.author_id,
        );
        if (tempIdx === -1) return cleaned;
        const merged: DMPoll = { ...(old[tempIdx] as DMPoll), id: poll.id, created_at: poll.created_at, expires_at: poll.expires_at };
        return [...cleaned.filter((p) => p.id !== merged.id), merged];
      });
      toast.success('Sondage créé');
    },
  });
}

export function useVoteDMPoll() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ pollId, optionId }: { pollId: string; optionId: string; conversationId: string }) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('dm_poll_votes' as any).insert({ poll_id: pollId, option_id: optionId, user_id: user.id } as any);
      if (error) throw error;
    },
    onMutate: async ({ pollId, optionId, conversationId }) => {
      const queryKey = keyFor(conversationId);
      await queryClient.cancelQueries({ queryKey });
      const previousPolls = queryClient.getQueryData<DMPoll[]>(queryKey);

      if (previousPolls && user) {
        queryClient.setQueryData<DMPoll[]>(queryKey, (old) =>
          old?.map((poll) =>
            poll.id === pollId
              ? {
                  ...poll,
                  votes: [
                    ...poll.votes.filter((v) => !(v.user_id === user.id && v.option_id === optionId)),
                    {
                      id: `temp-${user.id}-${optionId}`,
                      poll_id: pollId,
                      option_id: optionId,
                      user_id: user.id,
                      created_at: new Date().toISOString(),
                    },
                  ],
                }
              : poll,
          ),
        );
      }
      return { previousPolls, queryKey };
    },
    onError: (_, __, context) => {
      if (context?.previousPolls && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousPolls);
      }
      toast.error('Erreur lors du vote');
    },
  });
}

export function useRemoveDMVote() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ pollId, optionId }: { pollId: string; optionId: string; conversationId: string }) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('dm_poll_votes' as any)
        .delete()
        .eq('poll_id', pollId)
        .eq('option_id', optionId)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onMutate: async ({ pollId, optionId, conversationId }) => {
      const queryKey = keyFor(conversationId);
      await queryClient.cancelQueries({ queryKey });
      const previousPolls = queryClient.getQueryData<DMPoll[]>(queryKey);

      if (previousPolls && user) {
        queryClient.setQueryData<DMPoll[]>(queryKey, (old) =>
          old?.map((poll) =>
            poll.id === pollId
              ? { ...poll, votes: poll.votes.filter((v) => !(v.option_id === optionId && v.user_id === user.id)) }
              : poll,
          ),
        );
      }
      return { previousPolls, queryKey };
    },
    onError: (_, __, context) => {
      if (context?.previousPolls && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousPolls);
      }
      toast.error('Erreur lors de la suppression du vote');
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: keyFor(variables.conversationId) });
    },
  });
}

export function useEndDMPoll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ pollId }: { pollId: string; conversationId: string }) => {
      const { error } = await supabase.from('dm_polls' as any).update({ expires_at: new Date().toISOString() } as any).eq('id', pollId);
      if (error) throw error;
    },
    onMutate: async ({ pollId, conversationId }) => {
      const queryKey = keyFor(conversationId);
      await queryClient.cancelQueries({ queryKey });
      const previousPolls = queryClient.getQueryData<DMPoll[]>(queryKey);
      queryClient.setQueryData<DMPoll[]>(queryKey, (old) =>
        old?.map((poll) => (poll.id === pollId ? { ...poll, expires_at: new Date().toISOString() } : poll)),
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
      queryClient.invalidateQueries({ queryKey: keyFor(variables.conversationId) });
    },
  });
}

export function useDeleteDMPoll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ pollId }: { pollId: string; conversationId: string }) => {
      const { error } = await supabase.from('dm_polls' as any).delete().eq('id', pollId);
      if (error) throw error;
    },
    onMutate: async ({ pollId, conversationId }) => {
      const queryKey = keyFor(conversationId);
      await queryClient.cancelQueries({ queryKey });
      const previousPolls = queryClient.getQueryData<DMPoll[]>(queryKey);
      queryClient.setQueryData<DMPoll[]>(queryKey, (old) => old?.filter((p) => p.id !== pollId));
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
      queryClient.invalidateQueries({ queryKey: keyFor(variables.conversationId) });
    },
  });
}

export interface UpdateDMPollData {
  pollId: string;
  conversationId: string;
  question: string;
  options: { id?: string; text: string; emoji: string | null }[];
}

export function useUpdateDMPoll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateDMPollData) => {
      const { error: pollError } = await supabase.from('dm_polls' as any).update({ question: data.question } as any).eq('id', data.pollId);
      if (pollError) throw pollError;

      const { error: deleteError } = await supabase.from('dm_poll_options' as any).delete().eq('poll_id', data.pollId);
      if (deleteError) throw deleteError;

      const optionsToInsert = data.options.map((opt, index) => ({
        poll_id: data.pollId,
        text: opt.text,
        emoji: opt.emoji,
        position: index,
      }));

      const { error: optionsError } = await supabase.from('dm_poll_options' as any).insert(optionsToInsert as any);
      if (optionsError) throw optionsError;
    },
    onMutate: async (data) => {
      const queryKey = keyFor(data.conversationId);
      await queryClient.cancelQueries({ queryKey });
      const previousPolls = queryClient.getQueryData<DMPoll[]>(queryKey);
      queryClient.setQueryData<DMPoll[]>(queryKey, (old) =>
        old?.map((poll) =>
          poll.id === data.pollId
            ? {
                ...poll,
                question: data.question,
                options: data.options.map((opt, i) => ({
                  id: opt.id || `temp-opt-${i}`,
                  poll_id: data.pollId,
                  text: opt.text,
                  emoji: opt.emoji,
                  position: i,
                })),
              }
            : poll,
        ),
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
      queryClient.invalidateQueries({ queryKey: keyFor(variables.conversationId) });
    },
  });
}
