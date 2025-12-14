import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Poll {
  id: string;
  channel_id: string;
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
}

export interface CreatePollData {
  channelId: string;
  question: string;
  options: { text: string; emoji: string | null }[];
  allowMultiple: boolean;
  expiresAt: Date | null;
}

export function usePolls(channelId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['polls', channelId],
    queryFn: async () => {
      if (!channelId) return [];

      const { data: polls, error } = await supabase
        .from('polls')
        .select(`
          *,
          author:profiles!polls_author_id_fkey(id, display_name, avatar_url, username)
        `)
        .eq('channel_id', channelId)
        .order('created_at', { ascending: false });

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
              .select('*')
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
    enabled: !!channelId && !!user
  });
}

export function useCreatePoll() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: CreatePollData) => {
      if (!user) throw new Error('Not authenticated');

      // Create poll
      const { data: poll, error: pollError } = await supabase
        .from('polls')
        .insert({
          channel_id: data.channelId,
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['polls', variables.channelId] });
      toast.success('Sondage créé');
    },
    onError: (error) => {
      console.error('Error creating poll:', error);
      toast.error('Erreur lors de la création du sondage');
    }
  });
}

export function useVotePoll() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ pollId, optionId, channelId }: { pollId: string; optionId: string; channelId: string }) => {
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
    onMutate: async ({ pollId, optionId, channelId }) => {
      await queryClient.cancelQueries({ queryKey: ['polls', channelId] });
      const previousPolls = queryClient.getQueryData<Poll[]>(['polls', channelId]);

      if (previousPolls && user) {
        queryClient.setQueryData<Poll[]>(['polls', channelId], (old) =>
          old?.map((poll) =>
            poll.id === pollId
              ? {
                  ...poll,
                  votes: [...poll.votes, {
                    id: `temp-${Date.now()}`,
                    poll_id: pollId,
                    option_id: optionId,
                    user_id: user.id,
                    created_at: new Date().toISOString()
                  }]
                }
              : poll
          )
        );
      }

      return { previousPolls };
    },
    onError: (_, variables, context) => {
      if (context?.previousPolls) {
        queryClient.setQueryData(['polls', variables.channelId], context.previousPolls);
      }
      toast.error('Erreur lors du vote');
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: ['polls', variables.channelId] });
    }
  });
}

export function useRemoveVote() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ pollId, optionId, channelId }: { pollId: string; optionId: string; channelId: string }) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('poll_votes')
        .delete()
        .eq('poll_id', pollId)
        .eq('option_id', optionId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onMutate: async ({ pollId, optionId, channelId }) => {
      await queryClient.cancelQueries({ queryKey: ['polls', channelId] });
      const previousPolls = queryClient.getQueryData<Poll[]>(['polls', channelId]);

      if (previousPolls && user) {
        queryClient.setQueryData<Poll[]>(['polls', channelId], (old) =>
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

      return { previousPolls };
    },
    onError: (_, variables, context) => {
      if (context?.previousPolls) {
        queryClient.setQueryData(['polls', variables.channelId], context.previousPolls);
      }
      toast.error('Erreur lors de la suppression du vote');
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: ['polls', variables.channelId] });
    }
  });
}

export function useDeletePoll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ pollId, channelId }: { pollId: string; channelId: string }) => {
      const { error } = await supabase
        .from('polls')
        .delete()
        .eq('id', pollId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['polls', variables.channelId] });
      toast.success('Sondage supprimé');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression du sondage');
    }
  });
}
